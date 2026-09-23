import lodash from 'lodash';
import { Association, HasOne, HasOneOptions, Includeable, Model, ModelStatic, Op, Transaction } from 'sequelize';

import Database from '../database';
import { appendChildCollectionNameAfterRepositoryFind } from '../listeners/append-child-collection-name-after-repository-find';
import { OptionsParser } from '../options-parser';
import { AdjacencyListRepository } from '../repositories/tree-repository/adjacency-list-repository';
import SortParser from '../sort-parser';

type IncludeType = {
  association: string;
  include?: IncludeType[];
  [key: string]: any;
};

// 合并函数
function mergeInclude(left: IncludeType[], right: IncludeType[]): IncludeType[] {
  // 存储合并后的结果
  const merged: IncludeType[] = [];

  // 对左边的项进行遍历
  left.forEach((baseItem) => {
    // 查找右边中与 baseItem.association 相匹配的项
    const updateItem = right.find((updateItem) => updateItem.association === baseItem.association);

    // 如果找到匹配的项，进行合并
    if (updateItem) {
      // 合并 include，递归合并嵌套的 include
      const mergedInclude =
        baseItem.include?.map((baseInclude) => {
          const updateInclude = updateItem.include
            ? updateItem.include.find((item) => item.association === baseInclude.association)
            : null;
          return updateInclude ? mergeInclude([baseInclude], [updateInclude])[0] : baseInclude;
        }) || [];

      // 合并后的项
      merged.push({
        ...baseItem, // 合并 baseItem 的其他属性
        ...updateItem, // 覆盖 baseItem 的属性
        include: mergedInclude, // 合并后的 include
      });
    } else {
      // 如果没有找到匹配项，则保留原始项
      merged.push(baseItem);
    }
  });

  // 对右边的项进行遍历，检查是否有 left 中没有的项
  right.forEach((updateItem) => {
    // 如果左边没有找到对应的项，则将其直接加入结果
    if (!left.find((baseItem) => baseItem.association === updateItem.association)) {
      merged.push(updateItem);
    }
  });

  return merged;
}

interface EagerLoadingNode {
  model: ModelStatic<any>;
  association: Association;
  attributes: Array<string>;
  rawAttributes: Array<string>;
  children: Array<EagerLoadingNode>;
  parent?: EagerLoadingNode;
  instances?: Array<Model>;
  order?: any;
  where?: any;
  inspectInheritAttribute?: boolean;
  includeOptions?: any;
}

const pushAttribute = (node, attribute) => {
  if (lodash.isArray(node.attributes) && !node.attributes.includes(attribute)) {
    node.attributes.push(attribute);
  }
};

const EagerLoadingNodeProto = {
  afterBuild(db: Database) {
    const collection = db.modelCollection.get(this.model);

    if (collection && collection.isParent()) {
      if (!this.attributes) {
        this.attributes = {
          include: [],
        };
      }

      OptionsParser.appendInheritInspectAttribute(
        lodash.isArray(this.attributes) ? this.attributes : this.attributes.include,
        collection,
      );

      this.inspectInheritAttribute = true;
    }
  },
};

export class EagerLoadingTree {
  public root: EagerLoadingNode;
  db: Database;
  private rootQueryOptions: any = {};

  constructor(root: EagerLoadingNode) {
    this.root = root;
  }

  static buildFromSequelizeOptions(options: {
    model: ModelStatic<any>;
    rootAttributes: Array<string>;
    rootOrder?: any;
    rootQueryOptions?: any;
    includeOption: Includeable | Includeable[];
    db: Database;
  }): EagerLoadingTree {
    const { model, rootAttributes, includeOption, db, rootQueryOptions } = options;

    const buildNode = (node) => {
      Object.setPrototypeOf(node, EagerLoadingNodeProto);
      node.afterBuild(db);
      return node;
    };

    const root = buildNode({
      model,
      association: null,
      rawAttributes: lodash.cloneDeep(rootAttributes),
      attributes: lodash.cloneDeep(rootAttributes),
      order: options.rootOrder,
      children: [],
    });

    const traverseIncludeOption = (includeOption, eagerLoadingTreeParent) => {
      const includeOptions = lodash.castArray(includeOption);

      if (includeOption.length > 0) {
        const modelPrimaryKey = eagerLoadingTreeParent.model.primaryKeyAttribute;
        pushAttribute(eagerLoadingTreeParent, modelPrimaryKey);
      }

      for (const include of includeOptions) {
        // skip fromFilter include option
        if (include.fromFilter) {
          continue;
        }

        const association = lodash.isString(include.association)
          ? eagerLoadingTreeParent.model.associations[include.association]
          : include.association;

        if (!association) {
          throw new Error(
            `Association "${include.association}" not found in model "${eagerLoadingTreeParent.model.name}"`,
          );
        }

        const associationType = association.associationType;

        const child = buildNode({
          model: association.target,
          association,
          rawAttributes: lodash.cloneDeep(include.attributes),
          attributes: lodash.cloneDeep(include.attributes),
          parent: eagerLoadingTreeParent,
          where: include.where,
          children: [],
          includeOption: include.options || {},
        });

        if (associationType === 'HasOne' || associationType === 'HasMany') {
          const { sourceKey, foreignKey } = association;

          pushAttribute(eagerLoadingTreeParent, sourceKey);
          pushAttribute(child, foreignKey);
        }

        if (associationType === 'BelongsTo') {
          const { targetKey, foreignKey } = association;

          pushAttribute(eagerLoadingTreeParent, foreignKey);
          pushAttribute(child, targetKey);
        }

        if (associationType === 'BelongsToMany') {
          const { sourceKey } = association;
          pushAttribute(eagerLoadingTreeParent, sourceKey);
        }

        eagerLoadingTreeParent.children.push(child);

        if (include.include) {
          traverseIncludeOption(include.include, child);
        }
      }
    };

    traverseIncludeOption(includeOption, root);

    const tree = new EagerLoadingTree(root);
    tree.db = db;
    tree.rootQueryOptions = rootQueryOptions;
    return tree;
  }

  async load(transaction?: Transaction) {
    const result = {};

    const orderOption = (association) => {
      const targetModel = association.target;
      const order = [];

      if (targetModel.primaryKeyAttribute && targetModel.rawAttributes[targetModel.primaryKeyAttribute].autoIncrement) {
        order.push([targetModel.primaryKeyAttribute, 'ASC']);
      }

      return order;
    };

    const loadRecursive = async (node, ids = []) => {
      let instances = [];

      if (!node.parent) {
        // load root instances
        const rootInclude = this.rootQueryOptions?.include || node.includeOption;

        const includeForFilter = rootInclude.filter((include) => {
          return (
            Object.keys(include.where || {}).length > 0 ||
            JSON.stringify(this.rootQueryOptions?.filter)?.includes(include.association)
          );
        });

        let includeForSort = [];
        let groupForSort = [];
        if (this.rootQueryOptions?.sort) {
          const sortParser = new SortParser(this.rootQueryOptions?.sort, node.model);
          const res = sortParser.toSequelizeParams();
          includeForSort = res.include;
          groupForSort = res.group;
        }

        const isBelongsToAssociationOnly = (includes, model) => {
          for (const include of includes) {
            const association = model.associations[include.association];
            if (!association) {
              return false;
            }

            if (association.associationType !== 'BelongsTo') {
              return false;
            }

            if (!isBelongsToAssociationOnly(include.include || [], association.target)) {
              return false;
            }
          }

          return true;
        };

        // includeForFilter + includeForSort
        const includeForAll = mergeInclude(includeForFilter, includeForSort);

        const belongsToAssociationsOnly = isBelongsToAssociationOnly(includeForAll, node.model);

        if (belongsToAssociationsOnly) {
          instances = await node.model.findAll({
            ...this.rootQueryOptions,
            attributes: node.attributes,
            distinct: true,
            include: includeForAll,
            transaction,
          });
        } else {
          const primaryKeyField = node.model.primaryKeyField || node.model.primaryKeyAttribute;

          if (!primaryKeyField) {
            throw new Error(`Model ${node.model.name} does not have primary key`);
          }

          const group = [`${node.model.name}.${primaryKeyField}`].concat(groupForSort);
          // find all ids
          const ids = (
            await node.model.findAll({
              ...this.rootQueryOptions,
              includeIgnoreAttributes: false,
              attributes: [primaryKeyField],
              group,
              transaction,
              include: includeForAll,
            } as any)
          ).map((row) => {
            return { row, pk: row[primaryKeyField] };
          });

          const findOptions = {
            where: { [primaryKeyField]: ids.map((i) => i.pk) },
            attributes: node.attributes,
          };

          if (node.order) {
            findOptions['order'] = node.order;
          }

          instances = await node.model.findAll({
            ...findOptions,
            transaction,
            include: includeForSort,
          });
        }

        // clear filter association value
        const associations = node.model.associations;
        for (const association of Object.keys(associations)) {
          for (const instance of instances) {
            delete instance[association];
            delete instance.dataValues[association];
          }
        }
      } else if (ids.length > 0) {
        const association = node.association;
        const associationType = association.associationType;

        let params: any = {};

        const otherFindOptions = lodash.pick(node.includeOption, ['sort']) || {};

        const collection = this.db.modelCollection.get(node.model);

        if (collection && !lodash.isEmpty(otherFindOptions)) {
          const parser = new OptionsParser(otherFindOptions, {
            collection,
          });

          params = parser.toSequelizeParams();
        }

        if (associationType === 'HasOne' || associationType === 'HasMany') {
          const foreignKey = association.foreignKey;
          const foreignKeyValues = node.parent.instances.map((instance) => instance.get(association.sourceKey));

          let where: any = { [foreignKey]: foreignKeyValues };
          if (node.where) {
            where = {
              [Op.and]: [where, node.where],
            };
          }

          const findOptions = {
            where,
            attributes: node.attributes,
            order: params.order || orderOption(association),
            transaction,
          };

          instances = await node.model.findAll(findOptions);
        }

        if (associationType === 'BelongsTo') {
          const foreignKey = association.foreignKey;
          const parentInstancesForeignKeyValues = node.parent.instances.map((instance) => instance.get(foreignKey));

          const collection = this.db.modelCollection.get(node.model);

          instances = await node.model.findAll({
            transaction,
            where: {
              [association.targetKey]: parentInstancesForeignKeyValues,
            },
            attributes: node.attributes,
          });

          // load parent instances recursively
          if (node.includeOption.recursively && instances.length > 0) {
            const targetKey = association.targetKey;
            const sql = AdjacencyListRepository.queryParentSQL({
              db: this.db,
              collection,
              foreignKey,
              targetKey,
              nodeIds: instances.map((instance) => instance.get(targetKey)),
            });

            const results = await this.db.sequelize.query(sql, {
              type: 'SELECT',
              transaction,
            });

            const parentInstances = await node.model.findAll({
              transaction,
              where: {
                [association.targetKey]: results.map((result) => result[targetKey]),
              },
              attributes: node.attributes,
            });

            const setInstanceParent = (instance) => {
              const parentInstance = parentInstances.find(
                (parentInstance) => parentInstance.get(targetKey) === instance.get(foreignKey),
              );
              if (!parentInstance) {
                return;
              }

              setInstanceParent(parentInstance);
              instance[association.as] = instance.dataValues[association.as] = parentInstance;
            };

            for (const instance of instances) {
              setInstanceParent(instance);
            }
          }
        }

        if (associationType === 'BelongsToMany') {
          const foreignKeyValues = node.parent.instances.map((instance) => instance.get(association.sourceKey));

          const hasOneOptions: HasOneOptions = {
            as: '_pivot_',
            foreignKey: association.otherKey,
            sourceKey: association.targetKey,
          };
          if (association.through.scope) {
            hasOneOptions.scope = association.through.scope;
          }
          const pivotAssoc = new HasOne(association.target, association.through.model, hasOneOptions);

          instances = await node.model.findAll({
            transaction,
            attributes: node.attributes,
            include: [
              {
                association: pivotAssoc,
                where: {
                  [association.foreignKey]: foreignKeyValues,
                },
              },
            ],
            order: params.order || orderOption(association),
          });
        }
      }

      node.instances = instances;

      for (const child of node.children) {
        const modelPrimaryKey = node.model.primaryKeyField || node.model.primaryKeyAttribute;
        const nodeIds = instances.map((instance) => instance.get(modelPrimaryKey));
        await loadRecursive(child, nodeIds);
      }

      // merge instances to parent
      if (!node.parent) {
        return;
      } else {
        const association = node.association;
        const associationType = association.associationType;

        const setParentAccessor = (parentInstance) => {
          const key = association.as;

          const children = parentInstance.getDataValue(association.as);

          if (association.isSingleAssociation) {
            const isEmpty = !children;
            parentInstance[key] = parentInstance.dataValues[key] = isEmpty ? null : children;
          } else {
            const isEmpty = !children || children.length === 0;
            parentInstance[key] = parentInstance.dataValues[key] = isEmpty ? [] : children;
          }
        };

        if (associationType === 'HasMany' || associationType === 'HasOne') {
          const foreignKey = association.foreignKey;
          const sourceKey = association.sourceKey;

          for (const instance of node.instances) {
            const parentInstance = node.parent.instances.find(
              (parentInstance) => parentInstance.get(sourceKey) === instance.get(foreignKey),
            );

            if (parentInstance) {
              if (associationType === 'HasMany') {
                const children = parentInstance.getDataValue(association.as);
                if (!children) {
                  parentInstance.setDataValue(association.as, [instance]);
                } else {
                  children.push(instance);
                }
              }

              if (associationType === 'HasOne') {
                const key = association.options.realAs || association.as;
                parentInstance[key] = parentInstance.dataValues[key] = instance;
              }
            }
          }
        }

        if (associationType === 'BelongsTo') {
          const foreignKey = association.foreignKey;
          const targetKey = association.targetKey;

          for (const instance of node.instances) {
            const parentInstances = node.parent.instances.filter(
              (parentInstance) => parentInstance.get(foreignKey) === instance.get(targetKey),
            );

            for (const parentInstance of parentInstances) {
              parentInstance.setDataValue(association.as, instance);
            }
          }
        }

        if (associationType === 'BelongsToMany') {
          const sourceKey = association.sourceKey;
          const foreignKey = association.foreignKey;

          const as = association.oneFromTarget.as;

          for (const instance of node.instances) {
            // set instance accessor
            instance[as] = instance.dataValues[as] = instance['_pivot_'];
            delete instance.dataValues['_pivot_'];
            delete instance['_pivot_'];

            const parentInstance = node.parent.instances.find(
              (parentInstance) => parentInstance.get(sourceKey) === instance.dataValues[as].get(foreignKey),
            );

            if (parentInstance) {
              const children = parentInstance.getDataValue(association.as);

              if (!children) {
                parentInstance.setDataValue(association.as, [instance]);
              } else {
                children.push(instance);
              }
            }
          }
        }

        for (const parent of node.parent.instances) {
          setParentAccessor(parent);
        }
      }
    };

    await loadRecursive(this.root);

    const appendChildCollectionName = appendChildCollectionNameAfterRepositoryFind(this.db);

    const setInstanceAttributes = (node) => {
      if (node.inspectInheritAttribute) {
        appendChildCollectionName({
          findOptions: {},
          data: node.instances,
          dataCollection: this.db.modelCollection.get(node.model),
        });
      }

      // skip pivot attributes
      if (node.association?.as === '_pivot_') {
        return;
      }

      // if no attributes are specified, return empty fields
      const nodeRawAttributes = node.rawAttributes || [];

      if (!lodash.isArray(nodeRawAttributes)) {
        return;
      }

      const nodeChildrenAs = node.children.map((child) => child.association.as);

      const includeAttributes = [...nodeRawAttributes, ...nodeChildrenAs];

      if (node.inspectInheritAttribute) {
        includeAttributes.push('__schemaName', '__tableName', '__collection');
      }

      for (const instance of node.instances) {
        instance.dataValues = lodash.pick(instance.dataValues, includeAttributes);
      }
    };

    // traverse tree and set instance attributes
    const traverse = (node) => {
      setInstanceAttributes(node);

      for (const child of node.children) {
        traverse(child);
      }
    };

    traverse(this.root);
    return result;
  }
}
