import { flatten } from 'flat';
import lodash from 'lodash';
import {
  Association,
  BulkCreateOptions,
  ModelStatic,
  Op,
  Sequelize,
  FindAndCountOptions as SequelizeAndCountOptions,
  CountOptions as SequelizeCountOptions,
  CreateOptions as SequelizeCreateOptions,
  DestroyOptions as SequelizeDestroyOptions,
  FindOptions as SequelizeFindOptions,
  UpdateOptions as SequelizeUpdateOptions,
  Transactionable,
  WhereOperators,
} from 'sequelize';

import { Collection } from './collection';
import { Database } from './database';
import mustHaveFilter from './decorators/must-have-filter-decorator';
import injectTargetCollection from './decorators/target-collection-decorator';
import { transactionWrapperBuilder } from './decorators/transaction-decorator';
import { EagerLoadingTree } from './eager-loading/eager-loading-tree';
import { rebaseAssociationScope, rebaseAssociationScopeToRoot } from './eager-loading/rebase-association-scope';
import { ArrayFieldRepository } from './field-repository/array-field-repository';
import { ArrayField, RelationField } from './fields';
import FilterParser from './filter-parser';
import { Model } from './model';
import operators from './operators';
import { OptionsParser } from './options-parser';
import { BelongsToManyRepository } from './relation-repository/belongs-to-many-repository';
import { BelongsToRepository } from './relation-repository/belongs-to-repository';
import { HasManyRepository } from './relation-repository/hasmany-repository';
import { HasOneRepository } from './relation-repository/hasone-repository';
import { RelationRepository } from './relation-repository/relation-repository';
import { updateAssociations, updateModelByValues } from './update-associations';
import { UpdateGuard } from './update-guard';

const debug = require('debug')('noco-database');

interface CreateManyOptions extends BulkCreateOptions {
  records: Values[];
}

export type { Transactionable } from 'sequelize';

export interface FilterAble {
  filter: Filter;
}

export type TargetKey = string | number;
export type TK = TargetKey | TargetKey[];

type FieldValue = string | number | bigint | boolean | Date | Buffer | null | FieldValue[] | FilterWithOperator;

type Operators = keyof typeof operators & keyof WhereOperators;

export type FilterWithOperator = {
  [key: string]:
    | {
        [K in Operators]: FieldValue;
      }
    | FieldValue;
};

export type FilterWithValue = {
  [key: string]: FieldValue;
};

type FilterAnd = {
  $and: Filter[];
};

type FilterOr = {
  $or: Filter[];
};

export type Filter = FilterWithOperator | FilterWithValue | FilterAnd | FilterOr;

export type Appends = string[];
export type Except = string[];
export type Fields = string[];
export type Sort = string[] | string;

export type WhiteList = string[];
export type BlackList = string[];

export type AssociationKeysToBeUpdate = string[];

export type Values = any;

export type CountOptions = Omit<SequelizeCountOptions, 'distinct' | 'where' | 'include'> &
  Transactionable & {
    filter?: Filter;
    context?: any;
  } & FilterByTk;

export interface FilterByTk {
  filterByTk?: TargetKey;
  targetCollection?: string;
}

export type FindOptions = SequelizeFindOptions & CommonFindOptions & FilterByTk;

export interface CommonFindOptions extends Transactionable {
  filter?: Filter;
  fields?: Fields;
  appends?: Appends;
  except?: Except;
  sort?: Sort;
  context?: any;
  tree?: boolean;
}

export type FindOneOptions = Omit<FindOptions, 'limit'> & {
  targetCollection?: string;
};

export interface DestroyOptions extends SequelizeDestroyOptions {
  filter?: Filter;
  filterByTk?: TargetKey | TargetKey[];
  truncate?: boolean;
  context?: any;
}

type FindAndCountOptions = Omit<SequelizeAndCountOptions, 'where' | 'include' | 'order'> & CommonFindOptions;

export interface CreateOptions extends SequelizeCreateOptions {
  values?: Values | Values[];
  whitelist?: WhiteList;
  blacklist?: BlackList;
  updateAssociationValues?: AssociationKeysToBeUpdate;
  context?: any;
}

export interface UpdateOptions extends Omit<SequelizeUpdateOptions, 'where'> {
  values: Values;
  filter?: Filter;
  filterByTk?: TargetKey;
  whitelist?: WhiteList;
  blacklist?: BlackList;
  updateAssociationValues?: AssociationKeysToBeUpdate;
  targetCollection?: string;
  context?: any;
  skipSortScopeChangeAppend?: boolean;
  /**
   * false: will not update updateAt field, default: false
   * @default false
   */
  silent?: boolean;
}

interface UpdateManyOptions extends Omit<UpdateOptions, 'values'> {
  records: Values[];
}

interface RelatedQueryOptions {
  database: Database;
  field: RelationField;
  source: {
    idOrInstance: any;
    collection: Collection;
  };
  target: {
    association: Association & {
      accessors: any;
    };
    collection: Collection;
  };
}

const transaction = transactionWrapperBuilder(function () {
  return (<Repository>this).collection.model.sequelize.transaction();
});

class RelationRepositoryBuilder<R extends RelationRepository> {
  collection: Collection;
  associationName: string;
  association: Association | { associationType: string };

  builderMap = {
    HasOne: HasOneRepository,
    BelongsTo: BelongsToRepository,
    BelongsToMany: BelongsToManyRepository,
    HasMany: HasManyRepository,
    ArrayField: ArrayFieldRepository,
  };

  constructor(collection: Collection, associationName: string) {
    this.collection = collection;
    this.associationName = associationName;
    this.association = this.collection.model.associations[this.associationName];

    if (!this.association) {
      const field = collection.getField(associationName);
      if (field && field instanceof ArrayField) {
        this.association = {
          associationType: 'ArrayField',
        };
      }
    }
  }

  of(id: string | number): R {
    if (!this.association) {
      return;
    }
    const klass = this.builder()[this.association.associationType];
    return new klass(this.collection, this.associationName, id);
  }

  protected builder() {
    return this.builderMap;
  }
}

export interface AggregateOptions extends Transactionable {
  method: 'avg' | 'count' | 'min' | 'max' | 'sum';
  field?: string;
  filter?: Filter;
  distinct?: boolean;
  context?: any;
}

interface FirstOrCreateOptions extends Transactionable {
  filterKeys: string[];
  values?: Values;
  hooks?: boolean;
}

export class Repository<TModelAttributes extends {} = any, TCreationAttributes extends {} = TModelAttributes> {
  readonly supportsAssociationReadScope = true;
  database: Database;
  collection: Collection;
  model: ModelStatic<Model>;

  constructor(collection: Collection) {
    this.database = collection.context.database;
    this.collection = collection;
    this.model = collection.model;
  }

  /**
   * Check if database connection is closed before executing query
   */
  protected checkConnection() {
    if (this.database.closed()) {
      throw new Error(
        `Database connection is closed. Cannot execute query on collection "${this.collection.name}". The application may be reloading or restarting.`,
      );
    }
  }

  public static valuesToFilter(values: Values, filterKeys: Array<string>) {
    const filterAnd = [];
    const flattedValues = flatten(values);

    const keyWithOutArrayIndex = (key) => {
      const chunks = key.split('.');
      return chunks
        .filter((chunk) => {
          return !chunk.match(/\d+/);
        })
        .join('.');
    };

    for (const filterKey of filterKeys) {
      let filterValue;

      for (const flattedKey of Object.keys(flattedValues)) {
        const flattedKeyWithoutIndex = keyWithOutArrayIndex(flattedKey);

        if (flattedKeyWithoutIndex === filterKey) {
          if (filterValue) {
            if (Array.isArray(filterValue)) {
              filterValue.push(flattedValues[flattedKey]);
            } else {
              filterValue = [filterValue, flattedValues[flattedKey]];
            }
          } else {
            filterValue = flattedValues[flattedKey];
          }
        }
      }

      if (filterValue) {
        filterAnd.push({
          [filterKey]: filterValue,
        });
      }
    }

    return {
      $and: filterAnd,
    };
  }

  /**
   * return count by filter
   */
  async count(countOptions?: CountOptions): Promise<number> {
    this.checkConnection();

    let options = countOptions ? lodash.clone(countOptions) : {};

    const transaction = await this.getTransaction(options);

    if (countOptions?.filter) {
      options = {
        ...options,
        ...this.parseFilter(countOptions.filter, countOptions),
      };
    }

    if (countOptions?.filterByTk) {
      options['where'] = {
        [Op.and]: [
          options['where'] || {},
          {
            [this.collection.filterTargetKey]: options.filterByTk,
          },
        ],
      };
    }

    const queryOptions: any = {
      ...options,
      distinct: Boolean(this.collection.model.primaryKeyAttribute),
    };

    if (queryOptions.include?.length === 0) {
      delete queryOptions.include;
    }

    await this.applyAssociationReadScopes(
      queryOptions.include,
      this.collection.model,
      countOptions?.context,
      true,
      '',
      queryOptions,
    );

    const count = await this.collection.model.count({
      ...queryOptions,
      transaction,
    });

    // @ts-ignore
    return count;
  }

  async aggregate(options: AggregateOptions & { optionsTransformer?: (options: any) => any }): Promise<any> {
    this.checkConnection();

    const { method, field } = options;

    const queryOptions = this.buildQueryOptions({
      ...options,
      fields: [],
    });

    await this.applyAssociationReadScopes(
      queryOptions.include,
      this.collection.model,
      options.context,
      true,
      '',
      queryOptions,
    );

    options.optionsTransformer?.(queryOptions);
    const hasAssociationFilter = () => {
      if (queryOptions.include && queryOptions.include.length > 0) {
        const filterInclude = queryOptions.include.filter((include) => {
          return (
            Object.keys(include.where || {}).length > 0 ||
            JSON.stringify(queryOptions?.filter)?.includes(include.association)
          );
        });
        return filterInclude.length > 0;
      }
      return false;
    };

    if (hasAssociationFilter()) {
      const primaryKeyField = this.model.primaryKeyAttribute;
      const queryInterface = this.database.sequelize.getQueryInterface();

      const findOptions = {
        ...queryOptions,
        raw: true,
        includeIgnoreAttributes: false,
        attributes: [
          [
            Sequelize.literal(
              `DISTINCT ${queryInterface.quoteIdentifiers(`${this.collection.name}.${primaryKeyField}`)}`,
            ),
            primaryKeyField,
          ],
        ],
      };

      const ids = await this.model.findAll(findOptions);

      return await this.model.aggregate(field, method, {
        ...lodash.omit(queryOptions, ['where', 'include']),
        where: {
          [primaryKeyField]: ids.map((node) => node[primaryKeyField]),
        },
      });
    }

    return await this.model.aggregate(field, method, queryOptions);
  }

  /**
   * find
   * @param options
   */
  async find(options: FindOptions = {}) {
    if (options?.targetCollection && options?.targetCollection !== this.collection.name) {
      return await this.database.getCollection(options.targetCollection).repository.find(options);
    }

    this.checkConnection();

    const model = this.collection.model;
    const transaction = await this.getTransaction(options);

    const opts = {
      subQuery: false,
      ...this.buildQueryOptions(options),
    };

    const sortReadScopeIncludes = [];
    for (const sort of lodash.castArray(options.sort || [])) {
      if (typeof sort !== 'string') continue;
      const parts = sort.replace(/^-/, '').split('.');
      const firstAssociation = model.associations[parts[0]];
      if (!firstAssociation || opts.include?.some((item) => item.association === parts[0])) continue;
      const include: any = { association: parts[0], include: [] };
      let parent = include;
      let target = firstAssociation.target;
      for (const segment of parts.slice(1, -1)) {
        const association = target.associations[segment];
        if (!association) break;
        const child = { association: segment, include: [] };
        parent.include.push(child);
        parent = child;
        target = association.target;
      }
      await this.applyAssociationReadScopes([include], model, options.context, false, '', opts);
      if (include.readScope) sortReadScopeIncludes.push(include);
    }
    await this.applyAssociationReadScopes(opts.include, model, options.context, false, '', opts);

    let rows;

    if (opts.include?.length || sortReadScopeIncludes.length) {
      const eagerLoadingTree = EagerLoadingTree.buildFromSequelizeOptions({
        model,
        rootAttributes: opts.attributes,
        includeOption: opts.include || [],
        rootOrder: opts.order,
        rootQueryOptions: opts,
        db: this.database,
      });

      await eagerLoadingTree.load(transaction, sortReadScopeIncludes);

      rows = eagerLoadingTree.root.instances;
    } else {
      rows = await model.findAll({
        ...opts,
        transaction,
      });
    }

    await this.collection.db.emitAsync('afterRepositoryFind', {
      findOptions: options,
      dataCollection: this.collection,
      data: rows,
    });

    return rows;
  }

  /**
   * find and count
   * @param options
   */
  async findAndCount(options?: FindAndCountOptions): Promise<[Model[], number]> {
    options = {
      ...options,
      transaction: await this.getTransaction(options),
    };

    const count = await this.count(options);
    const results = count ? await this.find(options) : [];

    return [results, count];
  }

  /**
   * Find By Id
   *
   */
  findById(id: string | number) {
    return this.collection.model.findByPk(id);
  }

  /**
   * Find one record from database
   *
   * @param options
   */
  async findOne(options?: FindOneOptions) {
    const transaction = await this.getTransaction(options);

    const rows = await this.find({ ...options, limit: 1, transaction });
    return rows.length === 1 ? rows[0] : null;
  }

  /**
   * Get the first record matching the attributes or create it.
   */
  async firstOrCreate(options: FirstOrCreateOptions) {
    const { filterKeys, values, transaction, hooks } = options;
    const filter = Repository.valuesToFilter(values, filterKeys);

    const instance = await this.findOne({ filter, transaction });

    if (instance) {
      return instance;
    }

    return this.create({ values, transaction, hooks });
  }

  async updateOrCreate(options: FirstOrCreateOptions) {
    const { filterKeys, values, transaction, hooks } = options;
    const filter = Repository.valuesToFilter(values, filterKeys);

    const instance = await this.findOne({ filter, transaction });

    if (instance) {
      return await this.update({
        filterByTk: instance.get(this.collection.filterTargetKey || this.collection.model.primaryKeyAttribute),
        values,
        transaction,
        hooks,
      });
    }

    return this.create({ values, transaction, hooks });
  }

  /**
   * Save instance to database
   *
   * @param values
   * @param options
   */
  @transaction()
  async create(options: CreateOptions) {
    this.checkConnection();

    if (Array.isArray(options.values)) {
      return this.createMany({
        ...options,
        records: options.values,
      });
    }

    const transaction = await this.getTransaction(options);

    const guard = UpdateGuard.fromOptions(this.model, {
      ...options,
      action: 'create',
      underscored: this.collection.options.underscored,
    });

    const values = guard.sanitize(options.values || {});

    const instance = await this.model.create<any>(values, {
      ...options,
      transaction,
    });

    if (!instance) {
      return;
    }

    await updateAssociations(instance, values, {
      ...options,
      transaction,
    });

    if (options.hooks !== false) {
      await this.database.emitAsync(`${this.collection.name}.afterCreateWithAssociations`, instance, {
        ...options,
        transaction,
      });
      await this.database.emitAsync(`${this.collection.name}.afterSaveWithAssociations`, instance, {
        ...options,
        transaction,
      });
      instance.clearChangedWithAssociations();
    }

    return instance;
  }

  /**
   * Save Many instances to database
   *
   * @param records
   * @param options
   */
  @transaction()
  async createMany(options: CreateManyOptions) {
    const transaction = await this.getTransaction(options);
    const { records } = options;
    const instances = [];

    for (const values of records) {
      const instance = await this.create({ ...options, values, transaction });
      instances.push(instance);
    }

    return instances;
  }

  /**
   * Update model value
   *
   * @param values
   * @param options
   */
  @transaction()
  @mustHaveFilter()
  @injectTargetCollection
  async update(options: UpdateOptions & { forceUpdate?: boolean }) {
    this.checkConnection();
    if (Array.isArray(options.values)) {
      return this.updateMany({
        ...options,
        records: options.values,
      });
    }

    const transaction = await this.getTransaction(options);

    const guard = UpdateGuard.fromOptions(this.model, { ...options, underscored: this.collection.options.underscored });

    const values = guard.sanitize(options.values);

    // NOTE:
    // 1. better to be moved to separated API like bulkUpdate/updateMany
    // 2. strictly `false` comparing for compatibility of legacy api invoking
    if (options.individualHooks === false) {
      const { model: Model } = this.collection;
      // @ts-ignore
      const primaryKeyField = Model.primaryKeyField || Model.primaryKeyAttribute;
      // NOTE:
      // 1. find ids first for reusing `queryOptions` logic
      // 2. estimation memory usage will be N * M bytes (N = rows, M = model object memory)
      // 3. would be more efficient up to 100000 ~ 1000000 rows
      const queryOptions = this.buildQueryOptions({
        ...options,
        fields: [primaryKeyField],
      });
      const rows = await this.find({
        ...queryOptions,
        transaction,
      });
      const [result] = await Model.update(values, {
        where: {
          [primaryKeyField]: rows.map((row) => row.get(primaryKeyField)),
        },
        fields: options.fields,
        hooks: options.hooks,
        validate: options.validate,
        sideEffects: options.sideEffects,
        limit: options.limit,
        silent: options.silent,
        transaction,
      });
      // TODO: not support association fields except belongsTo
      return result;
    }

    const queryOptions = this.buildQueryOptions(options);

    const instances = await this.find({
      ...queryOptions,
      transaction,
    });

    for (const instance of instances) {
      await updateModelByValues(instance, values, {
        ...options,
        sanitized: true,
        transaction,
      });
    }

    if (options.hooks !== false) {
      for (const instance of instances) {
        await this.database.emitAsync(`${this.collection.name}.afterUpdateWithAssociations`, instance, {
          ...options,
          transaction,
        });
        await this.database.emitAsync(`${this.collection.name}.afterSaveWithAssociations`, instance, {
          ...options,
          transaction,
        });
        instance.clearChangedWithAssociations();
      }
    }

    return instances;
  }

  @transaction()
  async updateMany(options: UpdateManyOptions) {
    const transaction = await this.getTransaction(options);
    const { records } = options;
    const instances = [];

    for (const values of records) {
      const filterByTk = values[this.model.primaryKeyAttribute];
      if (!filterByTk) {
        throw new Error('filterByTk invalid');
      }
      const instance = await this.update({ values, filterByTk, transaction });
      instances.push(instance);
    }

    return instances;
  }

  @transaction((args, transaction) => {
    return {
      filterByTk: args[0],
      transaction,
    };
  })
  async destroy(options?: TargetKey | TargetKey[] | DestroyOptions) {
    this.checkConnection();
    const transaction = await this.getTransaction(options);

    const modelFilterKey = this.collection.filterTargetKey;

    options = <DestroyOptions>options;

    if (options['individualHooks'] === undefined) {
      options['individualHooks'] = true;
    }

    const filterByTk: TargetKey[] | undefined =
      options.filterByTk && !lodash.isArray(options.filterByTk)
        ? [options.filterByTk]
        : (options.filterByTk as TargetKey[] | undefined);

    if (
      this.collection.model.primaryKeyAttributes.length !== 1 &&
      filterByTk &&
      !lodash.get(this.collection.options, 'filterTargetKey')
    ) {
      if (this.collection.model.primaryKeyAttributes.length > 1) {
        throw new Error(`filterByTk is not supported for composite primary key`);
      } else {
        throw new Error(`filterByTk is not supported for collection that has no primary key`);
      }
    }

    if (filterByTk && !options.filter) {
      return await this.model.destroy({
        ...options,
        where: {
          [modelFilterKey]: {
            [Op.in]: filterByTk,
          },
        },
        transaction,
      });
    }

    if (options.filter) {
      if (
        this.collection.model.primaryKeyAttributes.length !== 1 &&
        !lodash.get(this.collection.options, 'filterTargetKey')
      ) {
        const queryOptions = {
          ...this.buildQueryOptions(options),
        };

        return await this.model.destroy({
          ...queryOptions,
          transaction,
        });
      }

      let pks = (
        await this.find({
          filter: options.filter,
          transaction,
        })
      ).map((instance) => instance.get(modelFilterKey) as TargetKey);

      if (filterByTk) {
        pks = lodash.intersection(
          pks.map((i) => `${i}`),
          filterByTk.map((i) => `${i}`),
        );
      }

      return await this.destroy({
        ...lodash.omit(options, 'filter'),
        filterByTk: pks,
        transaction,
      });
    }

    if (options.truncate) {
      return await this.model.destroy({
        ...options,
        truncate: true,
        transaction,
      });
    }
  }

  /**
   * @param association target association
   */
  relation<R extends RelationRepository>(association: string): RelationRepositoryBuilder<R> {
    return new RelationRepositoryBuilder<R>(this.collection, association);
  }

  public buildQueryOptions(options: any) {
    const parser = new OptionsParser(options, {
      collection: this.collection,
    });

    const params = parser.toSequelizeParams();
    debug('sequelize query params %o', params);

    if (options.where && params.where) {
      params.where = {
        [Op.and]: [params.where, options.where],
      };
    }

    return { where: {}, ...options, ...params };
  }

  protected async applyAssociationReadScopes(
    includes: any[],
    model: ModelStatic<any>,
    context: any,
    forCount = false,
    parentPath = '',
    rootOptions?: any,
    parentAllowedAppends?: string[],
  ) {
    if (!includes?.length || typeof context?.getAssociationReadScope !== 'function') {
      return;
    }

    for (const include of includes) {
      const association =
        typeof include.association === 'string' ? model.associations[include.association] : include.association;
      const target = association?.target;
      const path = parentPath ? `${parentPath}.${association?.as}` : association?.as;
      const collection = target && this.database.modelCollection.get(target);
      if (!collection) {
        continue;
      }

      const ownScope = await context.getAssociationReadScope(collection, association);
      let scope = ownScope;
      if (Array.isArray(parentAllowedAppends)) {
        const grantedWholeAssociation = parentAllowedAppends.includes(association.as);
        if (!grantedWholeAssociation) {
          const nestedPaths = parentAllowedAppends
            .filter((append) => append.startsWith(`${association.as}.`))
            .map((append) => append.slice(association.as.length + 1));
          const permittedFields = nestedPaths.filter((append) => collection.model.rawAttributes[append]);
          const permittedAppends = nestedPaths.filter((append) => collection.model.associations[append.split('.')[0]]);
          const ownAppends = ownScope?.appends;
          scope = {
            ...ownScope,
            fields: Array.isArray(ownScope?.fields)
              ? ownScope.fields.filter((field: string) => permittedFields.includes(field))
              : permittedFields,
            appends: Array.isArray(ownAppends)
              ? [
                  ...new Set(
                    ownAppends.flatMap((own: string) =>
                      permittedAppends
                        .filter(
                          (allowed) =>
                            own === allowed || own.startsWith(`${allowed}.`) || allowed.startsWith(`${own}.`),
                        )
                        .map((allowed) => (own.length > allowed.length ? own : allowed)),
                    ),
                  ),
                ]
              : permittedAppends,
          };
        }
      }
      if (scope) {
        if (Array.isArray(scope.fields) || Array.isArray(scope.appends)) {
          const assertField = (fieldPath: string) => {
            const prefix = `${path}.`;
            const relativePath = fieldPath.slice(prefix.length);
            const firstField = relativePath.split('.')[0];
            const allowedAssociation = scope.appends?.some(
              (append: string) => relativePath === append || relativePath.startsWith(`${append}.`),
            );
            const isAssociation = !!target.associations?.[firstField];
            const deniedField =
              Array.isArray(scope.fields) && !scope.fields.includes(firstField) && !allowedAssociation;
            const deniedAssociation = isAssociation && Array.isArray(scope.appends) && !allowedAssociation;
            if (fieldPath.startsWith(prefix) && (deniedField || deniedAssociation)) {
              if (typeof context.throw === 'function') {
                context.throw(403, 'Association field is not readable');
              }
              throw new Error('Association field is not readable');
            }
          };
          const checkFilter = (value: any) => {
            if (!value || typeof value !== 'object') return;
            for (const key of Reflect.ownKeys(value)) {
              if (typeof key === 'string' && key.startsWith('$') && key.endsWith('$')) {
                assertField(key.slice(1, -1));
              }
              checkFilter(value[key]);
            }
          };
          checkFilter(rootOptions?.where);
          for (const sort of lodash.castArray(rootOptions?.sort || [])) {
            if (typeof sort === 'string') assertField(sort.replace(/^-/, ''));
          }
        }
        const parsed = new OptionsParser({ filter: scope.filter }, { collection }).toSequelizeParams();
        include.readScope = { ...parsed, allowedFields: scope.fields, allowedAppends: scope.appends };
        if (forCount) {
          const required = include.required ?? Object.keys(include.where || {}).length > 0;
          const scopedWhere = rebaseAssociationScope(parsed.where || {}, path);
          const rootWhereReferencesPath = (value: any): boolean => {
            if (!value || typeof value !== 'object') return false;
            return Reflect.ownKeys(value).some(
              (key) =>
                (typeof key === 'string' && (key === `$${path}$` || key.startsWith(`$${path}.`))) ||
                rootWhereReferencesPath(value[key]),
            );
          };
          const hasNestedScopeJoins = parsed.include?.length > 0;
          const scopeFiltersRoot = required || include.required === true || rootWhereReferencesPath(rootOptions?.where);

          if (hasNestedScopeJoins) {
            if (scopeFiltersRoot) {
              rootOptions.where = {
                [Op.and]: [rootOptions.where || {}, rebaseAssociationScopeToRoot(parsed.where || {}, path)],
              };
              include.include = [...(include.include || []), ...parsed.include];
            }
          } else {
            include.where = { [Op.and]: [include.where || {}, scopedWhere] };
          }
          include.required = required;
        }
      }

      await this.applyAssociationReadScopes(
        include.include,
        target,
        context,
        forCount,
        path,
        rootOptions,
        scope?.appends,
      );
    }
  }

  protected parseFilter(filter: Filter, options?: any) {
    const parser = new FilterParser(filter, {
      collection: this.collection,
      app: {
        ctx: options?.context,
      },
    });
    return parser.toSequelizeParams();
  }

  protected async getTransaction(options: any, autoGen = false) {
    if (lodash.isPlainObject(options) && options.transaction) {
      return options.transaction;
    }

    if (autoGen) {
      return await this.model.sequelize.transaction();
    }

    return null;
  }
}
