import { Mutex } from 'async-mutex';
import { isNumber } from 'lodash';
import { DataTypes } from 'sequelize';

import { BaseColumnFieldOptions, Field } from './field';

const sortFieldMutex = new Mutex();

export class SortField extends Field {
  get dataType() {
    return DataTypes.BIGINT;
  }

  setSortValue = async (instance, options) => {
    const { name, scopeKey } = this.options;
    const { model } = this.context.collection;

    if (
      isNumber(instance.get(name)) &&
      (options.skipSortScopeChangeAppend || instance._previousDataValues[scopeKey] === instance[scopeKey])
    ) {
      return;
    }

    const where = {};

    if (scopeKey) {
      const value = instance.get(scopeKey);
      if (value !== undefined && value !== null) {
        where[scopeKey] = value;
      }
    }

    await sortFieldMutex.runExclusive(async () => {
      const max = await model.max<number, any>(name, { ...options, where });
      const newValue = (max || 0) + 1;
      instance.set(name, newValue);
    });
  };

  onScopeChange = async (instance, options) => {
    const { scopeKey } = this.options;
    if (scopeKey && !instance.isNewRecord && instance._previousDataValues[scopeKey] !== instance[scopeKey]) {
      await this.setSortValue(instance, options);
    }
  };

  initRecordsSortValue = async ({ transaction }) => {
    // Guard against tables not existing yet during sync.
    // sequelize.sync() triggers afterSync for each model as it's created,
    // but related tables (e.g. collectionCategories for collections with
    // scopeKey) may not exist yet.  Only catch missing-table errors;
    // re-throw everything else so configuration / SQL / permission issues
    // surface immediately.
    try {
      const orderField = (() => {
        const model = this.collection.model;

        if (model.primaryKeyAttribute) {
          return model.primaryKeyAttribute;
        }

        if (model.rawAttributes['createdAt']) {
          return model.rawAttributes['createdAt'].field;
        }

        throw new Error(`can not find order key for collection ${this.collection.name}`);
      })();

      const needInit = async (scopeKey: string | null = null, scopeValue: any = null) => {
        const filter: Record<string, any> = {};
        if (scopeKey != null && scopeValue != null) {
          filter[scopeKey] = scopeValue;
        }

        const totalCount = await this.collection.repository.count({
          filter,
          transaction,
        });

        const emptyCount = await this.collection.repository.count({
          filter: {
            [this.name]: null,
            ...filter,
          },
          transaction,
        });

        return emptyCount === totalCount && emptyCount > 0;
      };

      const doInit = async (scopeKey: string | null = null, scopeValue: any = null) => {
        const queryInterface = this.collection.db.sequelize.getQueryInterface();
        const escape = this.collection.db.sequelize.escape.bind(this.collection.db.sequelize);

        if (scopeKey) {
          const scopeAttribute = this.collection.model.rawAttributes[scopeKey];

          if (!scopeAttribute) {
            throw new Error(`can not find scope field ${scopeKey} for collection ${this.collection.name}`);
          }

          scopeKey = scopeAttribute.field;
        }

        const quotedOrderField = queryInterface.quoteIdentifier(orderField);

        const sortColumnName = queryInterface.quoteIdentifier(this.collection.model.rawAttributes[this.name].field);

        let sql: string;

        const whereClause =
          scopeKey != null && scopeValue != null
            ? (() => {
                const filteredScopeValue = scopeValue.filter((v: any) => v !== null);
                if (filteredScopeValue.length === 0) {
                  return '';
                }
                const initialClause = `
  WHERE ${queryInterface.quoteIdentifier(scopeKey)} IN (${filteredScopeValue.map((v: any) => escape(v)).join(', ')})`;

                const nullCheck = scopeValue.includes(null)
                  ? ` OR ${queryInterface.quoteIdentifier(scopeKey)} IS NULL`
                  : '';
                return initialClause + nullCheck;
              })()
            : '';

        if (this.collection.db.inDialect('postgres')) {
          sql = `
    UPDATE ${this.collection.quotedTableName()}
    SET ${sortColumnName} = ordered_table.new_sequence_number
    FROM (
      SELECT *, ROW_NUMBER() OVER (${
        scopeKey ? `PARTITION BY ${queryInterface.quoteIdentifier(scopeKey)}` : ''
      } ORDER BY ${quotedOrderField}) AS new_sequence_number
      FROM ${this.collection.quotedTableName()}
      ${whereClause}
    ) AS ordered_table
    WHERE ${this.collection.quotedTableName()}.${quotedOrderField} = ordered_table.${quotedOrderField};
  `;
        } else if (this.collection.db.inDialect('sqlite')) {
          // Constrain the outer UPDATE to the same scope rows so that rows
          // outside the scope are not set to NULL by the correlated subquery.
          const outerWhere =
            scopeKey && scopeValue
              ? (() => {
                  const filtered = scopeValue.filter((v: any) => v !== null);
                  if (filtered.length === 0) return '';
                  let clause = `WHERE ${queryInterface.quoteIdentifier(scopeKey)} IN (${filtered.map((v: any) => escape(v)).join(', ')})`;
                  if (scopeValue.includes(null)) {
                    clause += ` OR ${queryInterface.quoteIdentifier(scopeKey)} IS NULL`;
                  }
                  return clause;
                })()
              : '';
          sql = `
    UPDATE ${this.collection.quotedTableName()}
    SET ${sortColumnName} = (
      SELECT new_sequence_number
      FROM (
        SELECT *, ROW_NUMBER() OVER (${
          scopeKey ? `PARTITION BY ${queryInterface.quoteIdentifier(scopeKey)}` : ''
        } ORDER BY ${quotedOrderField}) AS new_sequence_number
        FROM ${this.collection.quotedTableName()}
        ${whereClause}
      ) AS ordered_table
      WHERE ${this.collection.quotedTableName()}.${quotedOrderField} = ordered_table.${quotedOrderField}
    )
    ${outerWhere};
  `;
        } else if (this.collection.db.inDialect('mysql') || this.collection.db.inDialect('mariadb')) {
          sql = `
    UPDATE ${this.collection.quotedTableName()}
    JOIN (
      SELECT *, ROW_NUMBER() OVER (${
        scopeKey ? `PARTITION BY ${queryInterface.quoteIdentifier(scopeKey)}` : ''
      } ORDER BY ${quotedOrderField}) AS new_sequence_number
      FROM ${this.collection.quotedTableName()}
      ${whereClause}
    ) AS ordered_table ON ${this.collection.quotedTableName()}.${quotedOrderField} = ordered_table.${quotedOrderField}
    SET ${this.collection.quotedTableName()}.${sortColumnName} = ordered_table.new_sequence_number;
  `;
        }
        await this.collection.db.sequelize.query(sql, {
          transaction,
        });
      };

      const scopeKey = this.options.scopeKey;
      if (scopeKey) {
        const groups = await this.collection.repository.find({
          attributes: [scopeKey],
          group: [scopeKey],
          raw: true,
          transaction,
        });

        const needInitGroups = [];
        for (const group of groups) {
          if (await needInit(scopeKey, group[scopeKey])) {
            needInitGroups.push(group[scopeKey]);
          }
        }

        if (needInitGroups.length > 0) {
          await doInit(scopeKey, needInitGroups);
        }
      } else if (await needInit()) {
        await doInit();
      }
    } catch (err: unknown) {
      // During sync, related tables may not exist yet.  Only swallow
      // known "missing table / relation" errors; re-throw everything else.
      const msg = err instanceof Error ? err.message : String(err);
      const isMissingTable =
        /no such table|relation .* does not exist|Table .* doesn't exist|No description found|SQLITE_ERROR/i.test(
          msg,
        );
      if (!isMissingTable) {
        throw err;
      }
    }
  };

  bind() {
    super.bind();
    this.on('afterSync', this.initRecordsSortValue);
    this.on('beforeUpdate', this.onScopeChange);
    this.on('beforeCreate', this.setSortValue);
  }

  unbind() {
    super.unbind();
    this.off('beforeUpdate', this.onScopeChange);
    this.off('beforeCreate', this.setSortValue);
    this.off('afterSync', this.initRecordsSortValue);
  }
}

export interface SortFieldOptions extends BaseColumnFieldOptions {
  type: 'sort';
  scopeKey?: string;
}
