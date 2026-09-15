import qs from 'node:querystring';
import { assign } from '@tachybase/utils';

import { Context } from '..';
import { DEFAULT_PAGE, DEFAULT_PER_PAGE } from '../constants';
import { getRepositoryFromParams, pageArgsToLimitArgs } from '../utils';

function totalPage(total, pageSize): number {
  return Math.ceil(total / pageSize);
}

const MAX_ASSOCIATION_SORT_DEPTH = 2;

function findArgs(ctx: Context) {
  const resourceName = ctx.action.resourceName;
  const params = ctx.action.params;
  // 处理 sort 字段
  const includeSort = params.sort?.filter((item) => typeof item === 'string' && item.split('.').length > 1) ?? [];
  const sortItems = [];
  includeSort.forEach((sort) => {
    const parts = sort[0] === '-' ? sort.slice(1, sort.length).split('.') : sort.split('.');
    const prefix = parts.slice(0, -1).join('.');
    const sign = sort[0] === '-' ? '-' : '';
    const sortItem = sign + parts.slice(-1).join('.');
    const findIndex = sortItems.findIndex((item) => item.prefix === prefix);
    if (findIndex !== -1) {
      sortItems[findIndex].items.push(sortItem);
    } else {
      sortItems.push({
        prefix,
        sortItems: [sortItem],
      });
    }
  });

  const associationAppend: Set<string> = new Set();

  sortItems.forEach((item) => {
    const i = params.appends?.findIndex((append) => append === item.prefix) ?? -1;
    if (i !== -1) {
      params.appends[i] = `${item.prefix}(${qs.stringify({ sort: item.sortItems })})`;
    } else if (item.prefix) {
      associationAppend.add(item.prefix);
    }
  });
  if (associationAppend.size) {
    if (!params.appends) {
      params.appends = [];
    }
    for (const prefix of associationAppend) {
      params.appends.push(prefix);
    }
  }

  // 考虑默认深度为MAX_ASSOCIATION_SORT_DEPTH
  params.sort = params.sort?.filter((item) => item.split('.').length <= 1 + MAX_ASSOCIATION_SORT_DEPTH) ?? [];

  if (params.tree) {
    const [collectionName, associationName] = resourceName.split('.');
    const collection = ctx.db.getCollection(resourceName);
    // tree collection 或者关系表是 tree collection
    if (collection.options.tree && !(associationName && collectionName === collection.name)) {
      const foreignKey =
        collection.treeParentField?.collection.model.rawAttributes[collection.treeParentField?.foreignKey]?.field ||
        'parentId';
      assign(params, { filter: { [foreignKey]: null } }, { filter: 'andMerge' });
    }
  }
  const { tree, fields, filter, appends, except, sort } = params;

  return { tree, filter, fields, appends, except, sort };
}

async function listWithPagination(ctx: Context) {
  const { page = DEFAULT_PAGE, pageSize = DEFAULT_PER_PAGE } = ctx.action.params;

  const repository = getRepositoryFromParams(ctx);
  const resourceName = ctx.action.resourceName;
  const collection = ctx.db.getCollection(resourceName);
  const options = {
    context: ctx,
    ...findArgs(ctx),
    ...pageArgsToLimitArgs(parseInt(String(page)), parseInt(String(pageSize))),
  };

  Object.keys(options).forEach((key) => {
    if (options[key] === undefined) {
      delete options[key];
    }
  });
  let filterTreeData = [];
  let filterTreeCount = 0;
  let hasFilteredTree = false;
  if (ctx.action.params.tree && options.filter) {
    const parentKey = collection.treeParentField?.foreignKey || 'parentId';
    const params = Object.values(options.filter).flat()[0] || {};
    if (Object.entries(params).length) {
      hasFilteredTree = true;
      const readScope = await ctx.getTreeReadScope?.(collection);
      const scopeFilter = readScope?.filter || {};
      const scopedFilter = (filter) => ({ $and: [scopeFilter, filter] });
      const matches = await repository.find({ filter: scopedFilter(params), context: ctx });
      const visible = new Map(matches.map((item) => [item.id, item]));
      let ancestorIds = matches.map((item) => item.get(parentKey)).filter((id) => id != null);
      let descendantIds = matches.map((item) => item.id);
      while (ancestorIds.length || descendantIds.length) {
        const branches = [];
        if (ancestorIds.length) branches.push({ id: { $in: ancestorIds } });
        if (descendantIds.length) branches.push({ [parentKey]: { $in: descendantIds } });
        const adjacent = await repository.find({ filter: scopedFilter({ $or: branches }), context: ctx });
        ancestorIds = [];
        descendantIds = [];
        for (const row of adjacent) {
          if (visible.has(row.id)) continue;
          visible.set(row.id, row);
          if (row.get(parentKey) != null) ancestorIds.push(row.get(parentKey));
          descendantIds.push(row.id);
        }
      }
      const ids = [...visible.keys()];
      const requiredFields = ['id', parentKey];
      const requestedFields = Array.isArray(options.fields) ? options.fields : undefined;
      const [rows, count] = await repository.findAndCount({
        filter: scopedFilter({ id: { $in: ids } }),
        fields: requestedFields !== undefined ? [...new Set([...requestedFields, ...requiredFields])] : undefined,
        except: options.except?.filter((field) => !requiredFields.includes(field)),
        appends: options.appends || [],
        sort: options.sort,
        context: ctx,
      });
      const _data = rows.map((item) => item.dataValues);
      const visibleIds = new Set(_data.map((row) => row.id));
      const father = _data.filter((parent) => parent[parentKey] == null || !visibleIds.has(parent[parentKey]));
      const transTreeData = (father, allRows) => {
        father.forEach((parent, index) => {
          const children = allRows.filter((child) => child[parentKey] === parent.id);
          const i = index.toString();
          parent.__index = parent.father || parent.father === '0' ? parent.father + '.children.' + i : i;
          if (children?.length) {
            const transChild = children.map((child) => {
              return {
                ...child,
                father: parent.__index,
              };
            });
            parent.children = transChild;
          }
          if (parent.children?.length) {
            transTreeData(parent.children, allRows);
          }
        });
      };
      transTreeData(father, _data);
      const stripInternalFields = (nodes) => {
        for (const row of nodes) {
          for (const field of requiredFields) {
            if (
              (requestedFields !== undefined && !requestedFields.includes(field)) ||
              options.except?.includes(field)
            ) {
              delete row[field];
            }
          }
          if (row.children?.length) stripInternalFields(row.children);
        }
      };
      stripInternalFields(father);
      filterTreeData = father.slice(options.offset || 0, (options.offset || 0) + options.limit);
      filterTreeCount = father.length;
    }
  }
  const [rows, count] = hasFilteredTree ? [filterTreeData, filterTreeCount] : await repository.findAndCount(options);
  ctx.body = {
    count: hasFilteredTree ? filterTreeCount : count,
    rows: hasFilteredTree ? filterTreeData : rows,
    page: Number(page),
    pageSize: Number(pageSize),
    totalPage: totalPage(count, pageSize),
  };
}

async function listWithNonPaged(ctx: Context) {
  const repository = getRepositoryFromParams(ctx);

  const rows = await repository.find({ context: ctx, ...findArgs(ctx) });

  ctx.body = rows;
}

export async function list(ctx: Context, next) {
  const { paginate } = ctx.action.params;

  if (paginate === false || paginate === 'false') {
    await listWithNonPaged(ctx);
    ctx.paginate = false;
  } else {
    await listWithPagination(ctx);
    ctx.paginate = true;
  }

  await next();
}

Object.assign(list, { supportsScopedTreeRead: true });
