import Database from '@tachybase/database';

export function afterUpdateForForeignKeyField(db: Database) {
  function generateFkOptions(collectionName: string, foreignKey: string) {
    const collection = db.getCollection(collectionName);

    if (!collection) {
      throw new Error('collection not found');
    }

    const M = collection.model;

    const attr = M.rawAttributes[foreignKey];

    if (!attr) {
      throw new Error(`${collectionName}.${foreignKey} does not exists`);
    }

    return attribute2field(attr);
  }

  // Foreign key types are only integer and string
  function attribute2field(attribute: any) {
    let type = 'bigInt';
    if (attribute.type.constructor.name === 'INTEGER') {
      type = 'integer';
    } else if (attribute.type.constructor.name === 'STRING') {
      type = 'string';
    }
    const name = attribute.fieldName;
    const data = {
      interface: 'integer',
      name,
      type,
      uiSchema: {
        type: 'number',
        title: name,
        'x-component': 'InputNumber',
        'x-read-pretty': true,
      },
    };
    if (type === 'string') {
      data['interface'] = 'input';
      data['uiSchema'] = {
        type: 'string',
        title: name,
        'x-component': 'Input',
        'x-read-pretty': true,
      };
    }
    return data;
  }

  async function createFieldIfNotExists({ values, transaction }) {
    const { collectionName, name } = values;
    if (!collectionName || !name) {
      throw new Error(`field options invalid`);
    }
    const r = db.getRepository('fields');
    const instance = await r.findOne({
      filter: {
        collectionName,
        name,
      },
      transaction,
    });

    if (instance) {
      if (instance.type !== values.type) {
        throw new Error(`fk type invalid`);
      }
      instance.set('sort', 1);
      instance.set('isForeignKey', true);
      await instance.save({ transaction });
    } else {
      const creatInstance = await r.create({
        values: {
          isForeignKey: true,
          ...values,
        },
        transaction,
      });
      // SortField#setSortValue instance._previousDataValues[scopeKey] judgment cause create set sort:1 invalid, need update
      creatInstance.set('sort', 1);
      await creatInstance.save({ transaction });
    }
    // update ID sort:0
    await r.update({
      filter: {
        collectionName,
        options: {
          primaryKey: true,
        },
      },
      values: {
        sort: 0,
      },
      transaction,
    });
  }

  const hook = async (model, { transaction, context }) => {
    if (!context) return;

    const {
      interface: interfaceType,
      collectionName,
      target: newTarget,
      foreignKey: newForeignKey,
      otherKey: newOtherKey,
      through,
      source,
      type,
    } = model.get();

    if (source || !interfaceType) return;
    if (newTarget === '__temp__') return;
    const { target: oldTarget, foreignKey: oldForeignKey, otherKey: oldOtherKey } = model.previous('options') || {};

    const fieldsRepo = db.getRepository('fields');

    const hasTargetChanged = oldTarget !== undefined && oldTarget !== newTarget;
    const hasForeignKeyChanged = oldForeignKey !== undefined && oldForeignKey !== newForeignKey;
    const hasOtherKeyChanged = oldOtherKey !== undefined && oldOtherKey !== newOtherKey;

    const needUpdate = hasTargetChanged || hasForeignKeyChanged || hasOtherKeyChanged;
    const collection = db.getCollection(model.get('collectionName'));
    collection?.updateField(model.get('name'), model.get());
    const field = collection?.getField(model.get('name'));
    if (!needUpdate) return;
    try {
      field?.unbind?.();
      field.bind();
    } catch (e) {
      throw e;
    }
    async function removeOldForeignKeyField(collection: string, fkName: string) {
      if (!collection || !fkName) return;

      const exists = await fieldsRepo.findOne({
        filter: {
          collectionName: collection,
          name: fkName,
          // isForeignKey: true,
        },
        transaction,
      });

      if (exists) {
        await fieldsRepo.destroy({
          filter: {
            collectionName: collection,
            name: fkName,
            // isForeignKey: true,
          },
          transaction,
        });
      }
    }

    // 1. foreign key 在 target collection
    if (['oho', 'o2m'].includes(interfaceType)) {
      await removeOldForeignKeyField(oldTarget, oldForeignKey);

      const values = generateFkOptions(newTarget, newForeignKey);
      await createFieldIfNotExists({
        values: {
          collectionName: newTarget,
          ...values,
        },
        transaction,
      });
    }
    // 2. foreign key 在 source collection
    else if (['obo', 'm2o'].includes(interfaceType)) {
      await removeOldForeignKeyField(collectionName, oldForeignKey);
      const values = generateFkOptions(collectionName, newForeignKey);
      await createFieldIfNotExists({
        values: {
          collectionName,
          ...values,
        },
        transaction,
      });
    } else if (['linkTo', 'm2m'].includes(interfaceType)) {
      if (type !== 'belongsToMany') {
        return;
      }

      const collectionsRepo = db.getRepository('collections');

      const existingThrough = await collectionsRepo.findOne({
        filter: {
          name: through,
        },
        transaction,
      });

      if (existingThrough) {
        await collectionsRepo.destroy({
          filter: {
            name: through,
          },
          transaction,
        });
      }

      await collectionsRepo.create({
        values: {
          name: through,
          title: through,
          timestamps: true,
          autoGenId: false,
          hidden: true,
          autoCreate: true,
          isThrough: true,
          sortable: false,
        },
        context,
        transaction,
      });

      const opts1 = generateFkOptions(through, newForeignKey);
      const opts2 = generateFkOptions(through, newOtherKey);

      await createFieldIfNotExists({
        values: {
          collectionName: through,
          ...opts1,
        },
        transaction,
      });

      await createFieldIfNotExists({
        values: {
          collectionName: through,
          ...opts2,
        },
        transaction,
      });
    }

    await model.migrate({
      isNew: true,
      transaction,
    });
  };

  return async (model, options) => {
    try {
      await hook(model, options);
    } catch (error) {
      console.error('Failed to update foreign key field:', error);
      throw error;
    }
  };
}
