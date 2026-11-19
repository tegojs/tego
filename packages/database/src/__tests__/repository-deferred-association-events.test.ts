import { Transaction } from 'sequelize';

import { mockDatabase } from '../mock-database';

describe('repository deferred association events', () => {
  let db: ReturnType<typeof mockDatabase>;
  let documents;
  let connections;
  let events: string[];

  beforeEach(async () => {
    db = mockDatabase({ dialect: 'sqlite', storage: ':memory:', logging: false });
    documents = db.collection({ name: 'documents', timestamps: false, fields: [{ name: 'name', type: 'string' }] });
    connections = db.collection({
      name: 'connections',
      timestamps: false,
      fields: [{ name: 'documentId', type: 'integer' }],
    });
    await db.sync();
    await documents.model.create({ id: 1, name: 'Original' });
    events = [];
    for (const action of ['Create', 'Update', 'Save'])
      db.on(`documents.after${action}WithAssociations`, async (record, options) => {
        const count = await connections.model.count({
          where: { documentId: record.getDataValue('id') },
          transaction: options.transaction,
        });
        events.push(`${action}:${record.getDataValue('name')}:${count}`);
      });
  });
  afterEach(async () => {
    await db.close();
  });
  const begin = () => db.sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE });
  const finish = async (transaction) => {
    if (!transaction.finished) await transaction.rollback();
  };

  it('keeps default create and update association events immediate', async () => {
    await documents.repository.create({ values: { id: 2, name: 'Created' } });
    await documents.repository.update({ filterByTk: 1, values: { name: 'Updated' } });
    expect(events).toEqual(['Create:Created:0', 'Save:Created:0', 'Update:Updated:0', 'Save:Updated:0']);
  });
  it.each(['create', 'update'] as const)(
    'defers %s association events until connections have been persisted',
    async (action) => {
      const transaction = await begin();
      const rowEvents: string[] = [];
      db.on(`documents.after${action === 'create' ? 'Create' : 'Update'}`, () => {
        rowEvents.push('row');
      });
      try {
        await documents.repository.withDeferredAssociationEvents(transaction, async (flush) => {
          const id = action === 'create' ? 2 : 1;
          if (action === 'create') await documents.repository.create({ values: { id, name: 'Changed' }, transaction });
          else await documents.repository.update({ filterByTk: id, values: { name: 'Changed' }, transaction });
          expect(rowEvents).toEqual(['row']);
          expect(events).toEqual([]);
          await connections.model.create({ documentId: id }, { transaction });
          await flush();
          expect(events).toEqual([`${action === 'create' ? 'Create' : 'Update'}:Changed:1`, 'Save:Changed:1']);
        });
        expect(transaction.finished).toBeUndefined();
        await transaction.commit();
      } finally {
        await finish(transaction);
      }
    },
  );
  it('preserves changed-field state until the delayed update event completes', async () => {
    const transaction = await begin();
    let changed: boolean | undefined;
    db.on('documents.afterUpdateWithAssociations', (record) => {
      changed = record.changedWithAssociations('name');
    });
    try {
      await documents.repository.withDeferredAssociationEvents(transaction, async (flush) => {
        const [record] = await documents.repository.update({ filterByTk: 1, values: { name: 'Changed' }, transaction });
        expect(record.changedWithAssociations('name')).toBe(true);
        await flush();
        expect(changed).toBe(true);
        expect(record.changedWithAssociations()).toBe(false);
      });
    } finally {
      await finish(transaction);
    }
  });
  it('rejects a successful return with pending events instead of silently dropping them', async () => {
    const transaction = await begin();
    try {
      await expect(
        documents.repository.withDeferredAssociationEvents(transaction, async () => {
          await documents.repository.update({ filterByTk: 1, values: { name: 'Pending' }, transaction });
        }),
      ).rejects.toThrow(/pending|flush/i);
      expect(transaction.finished).toBeUndefined();
      expect(events).toEqual([]);
    } finally {
      await finish(transaction);
    }
    expect((await documents.model.findByPk(1)).getDataValue('name')).toBe('Original');
  });
  it('preserves a callback error and leaves rollback to the caller', async () => {
    const transaction = await begin();
    const original = new Error('write failed');
    try {
      await expect(
        documents.repository.withDeferredAssociationEvents(transaction, async () => {
          await documents.repository.update({ filterByTk: 1, values: { name: 'Pending' }, transaction });
          throw original;
        }),
      ).rejects.toBe(original);
      expect(transaction.finished).toBeUndefined();
      expect(events).toEqual([]);
    } finally {
      await finish(transaction);
    }
  });
  it('preserves an event failure even if the callback catches the flush error', async () => {
    const transaction = await begin();
    const original = new Error('listener failed');
    db.on('documents.afterUpdateWithAssociations', () => {
      throw original;
    });
    try {
      await expect(
        documents.repository.withDeferredAssociationEvents(transaction, async (flush) => {
          await documents.repository.update({ filterByTk: 1, values: { name: 'Pending' }, transaction });
          try {
            await flush();
          } catch (error) {
            expect(error).toBe(original);
          }
        }),
      ).rejects.toBe(original);
      expect(transaction.finished).toBeUndefined();
    } finally {
      await finish(transaction);
    }
  });
  it('does not defer another repository on the same database and transaction', async () => {
    const transaction = await begin();
    let otherEmitted = false;
    db.on('connections.afterCreateWithAssociations', () => {
      otherEmitted = true;
    });
    try {
      await documents.repository.withDeferredAssociationEvents(transaction, async (flush) => {
        await documents.repository.update({ filterByTk: 1, values: { name: 'Pending' }, transaction });
        await connections.repository.create({ values: { documentId: 1 }, transaction });
        expect(otherEmitted).toBe(true);
        expect(events).toEqual([]);
        await flush();
      });
    } finally {
      await finish(transaction);
    }
  });
  it('isolates nested scopes for the same repository and transaction', async () => {
    const transaction = await begin();
    try {
      await documents.repository.withDeferredAssociationEvents(transaction, async (outerFlush) => {
        await documents.repository.create({ values: { id: 2, name: 'Outer' }, transaction });
        await documents.repository.withDeferredAssociationEvents(transaction, async (innerFlush) => {
          await documents.repository.create({ values: { id: 3, name: 'Inner' }, transaction });
          await innerFlush();
        });
        expect(events).toEqual(['Create:Inner:0', 'Save:Inner:0']);
        await outerFlush();
      });
      expect(events).toEqual(['Create:Inner:0', 'Save:Inner:0', 'Create:Outer:0', 'Save:Outer:0']);
    } finally {
      await finish(transaction);
    }
  });
  it('rejects a flush retained after its scope has ended', async () => {
    const transaction = await begin();
    let retained: () => Promise<void>;
    try {
      await documents.repository.withDeferredAssociationEvents(transaction, async (flush) => {
        retained = flush;
      });
      await expect(retained()).rejects.toThrow(/scope|active/i);
    } finally {
      await finish(transaction);
    }
  });
  it.each([undefined, null, {}])(
    'rejects an invalid transaction %j before running the callback',
    async (transaction) => {
      let ran = false;
      await expect(
        documents.repository.withDeferredAssociationEvents(transaction, async () => {
          ran = true;
        }),
      ).rejects.toThrow(/transaction/i);
      expect(ran).toBe(false);
      expect(await documents.model.count()).toBe(1);
    },
  );
  it('rejects an ended transaction', async () => {
    const transaction = await begin();
    await transaction.commit();
    await expect(documents.repository.withDeferredAssociationEvents(transaction, async () => {})).rejects.toThrow(
      /transaction/i,
    );
  });
  it('isolates overlapping scopes for the same repository and transaction', async () => {
    const transaction = await begin();
    let firstReady: () => void;
    let secondReady: () => void;
    let firstFlushed: () => void;
    const readyA = new Promise<void>((resolve) => {
      firstReady = resolve;
    });
    const readyB = new Promise<void>((resolve) => {
      secondReady = resolve;
    });
    const flushedA = new Promise<void>((resolve) => {
      firstFlushed = resolve;
    });
    try {
      await Promise.all([
        documents.repository.withDeferredAssociationEvents(transaction, async (flush) => {
          await documents.repository.create({ values: { id: 2, name: 'First' }, transaction });
          firstReady();
          await readyB;
          expect(events).toEqual([]);
          await flush();
          expect(events).toEqual(['Create:First:0', 'Save:First:0']);
          firstFlushed();
        }),
        documents.repository.withDeferredAssociationEvents(transaction, async (flush) => {
          await readyA;
          await documents.repository.create({ values: { id: 3, name: 'Second' }, transaction });
          secondReady();
          await flushedA;
          await flush();
        }),
      ]);
      expect(events).toEqual(['Create:First:0', 'Save:First:0', 'Create:Second:0', 'Save:Second:0']);
    } finally {
      await finish(transaction);
    }
  });
  it('rejects another database transaction before callback or write', async () => {
    const otherDb = mockDatabase({ dialect: 'sqlite', storage: ':memory:', logging: false });
    const otherTransaction = await otherDb.sequelize.transaction();
    const transaction = await begin();
    try {
      const callback = vi.fn();
      await expect(documents.repository.withDeferredAssociationEvents(otherTransaction, callback)).rejects.toThrow(
        /transaction/i,
      );
      expect(callback).not.toHaveBeenCalled();
      await documents.repository.withDeferredAssociationEvents(transaction, async () => {
        await expect(documents.repository.create({ values: { id: 2 }, transaction: otherTransaction })).rejects.toThrow(
          /original transaction/i,
        );
        await expect(
          documents.repository.update({ filterByTk: 1, values: { name: 'Wrong' }, transaction: otherTransaction }),
        ).rejects.toThrow(/original transaction/i);
      });
      expect(await documents.model.count({ transaction })).toBe(1);
      expect(events).toEqual([]);
    } finally {
      await finish(transaction);
      await finish(otherTransaction);
      await otherDb.close();
    }
  });
  it('rejects an invalid callback without ending the caller transaction', async () => {
    const transaction = await begin();
    try {
      await expect(documents.repository.withDeferredAssociationEvents(transaction, null)).rejects.toThrow(/callback/i);
      expect(transaction.finished).toBeUndefined();
    } finally {
      await finish(transaction);
    }
  });
  it('rejects a flush after the caller ends its transaction', async () => {
    const transaction = await begin();
    await expect(
      documents.repository.withDeferredAssociationEvents(transaction, async (flush) => {
        await documents.repository.update({ filterByTk: 1, values: { name: 'Pending' }, transaction });
        await transaction.rollback();
        await flush();
      }),
    ).rejects.toThrow(/transaction/i);
    expect(events).toEqual([]);
  });
  it('preserves hooks:false without creating delayed events', async () => {
    const transaction = await begin();
    try {
      await documents.repository.withDeferredAssociationEvents(transaction, async () => {
        await documents.repository.create({ values: { id: 2 }, hooks: false, transaction });
        await documents.repository.update({ filterByTk: 1, values: { name: 'Changed' }, hooks: false, transaction });
      });
      expect(events).toEqual([]);
    } finally {
      await finish(transaction);
    }
  });
  it('preserves the event-free bulk update path for individualHooks:false', async () => {
    const transaction = await begin();
    const rowEvent = vi.fn();
    db.on('documents.afterUpdate', rowEvent);
    try {
      await documents.repository.withDeferredAssociationEvents(transaction, async (flush) => {
        await documents.repository.update({
          filterByTk: 1,
          values: { name: 'Changed' },
          individualHooks: false,
          transaction,
        });
        expect(rowEvent).not.toHaveBeenCalled();
        expect(events).toEqual([]);
        await flush();
      });
      expect(events).toEqual([]);
      expect((await documents.model.findByPk(1, { transaction })).getDataValue('name')).toBe('Changed');
    } finally {
      await finish(transaction);
    }
  });
  it('dispatches writes triggered by a flushed listener immediately', async () => {
    const transaction = await begin();
    db.on('documents.afterCreateWithAssociations', async (_record, options) => {
      await documents.repository.update({
        filterByTk: 1,
        values: { name: 'Nested' },
        transaction: options.transaction,
      });
      expect(events).toEqual(['Create:Created:0', 'Update:Nested:0', 'Save:Nested:0']);
    });
    try {
      await documents.repository.withDeferredAssociationEvents(transaction, async (flush) => {
        await documents.repository.create({ values: { id: 2, name: 'Created' }, transaction });
        await flush();
      });
      expect(events).toEqual(['Create:Created:0', 'Update:Nested:0', 'Save:Nested:0', 'Save:Created:0']);
    } finally {
      await finish(transaction);
    }
  });
  it('rejects writes from a flushed listener that omit the scoped transaction', async () => {
    const transaction = await begin();
    const generate = vi
      .spyOn(db.sequelize, 'transaction')
      .mockRejectedValue(new Error('Unexpected transaction generation'));
    db.on('documents.afterUpdateWithAssociations', async () => {
      await documents.repository.update({ filterByTk: 1, values: { name: 'Nested' } });
    });
    try {
      await expect(
        documents.repository.withDeferredAssociationEvents(transaction, async (flush) => {
          await documents.repository.update({ filterByTk: 1, values: { name: 'Changed' }, transaction });
          await flush();
        }),
      ).rejects.toThrow(/original transaction/i);
      expect(generate).not.toHaveBeenCalled();
      expect((await documents.model.findByPk(1, { transaction })).getDataValue('name')).toBe('Changed');
    } finally {
      generate.mockRestore();
      await finish(transaction);
    }
    expect((await documents.model.findByPk(1)).getDataValue('name')).toBe('Original');
  });
  it.each(['create', 'update'] as const)(
    'rejects %s from a flushed listener using another transaction before writing',
    async (action) => {
      const otherDb = mockDatabase({ dialect: 'sqlite', storage: ':memory:', logging: false });
      const otherDocuments = otherDb.collection({
        name: 'documents',
        timestamps: false,
        fields: [{ name: 'name', type: 'string' }],
      });
      await otherDb.sync();
      await otherDocuments.model.create({ id: 1, name: 'Other original' });
      const otherTransaction = await otherDb.sequelize.transaction();
      const transaction = await begin();
      db.on('documents.afterUpdateWithAssociations', async () => {
        await documents.repository[action]({
          filterByTk: 1,
          values: { name: 'Wrong' },
          transaction: otherTransaction,
          hooks: false,
        });
      });
      try {
        await expect(
          documents.repository.withDeferredAssociationEvents(transaction, async (flush) => {
            await documents.repository.update({ filterByTk: 1, values: { name: 'Changed' }, transaction });
            await flush();
          }),
        ).rejects.toThrow(/original transaction/i);
        expect(await otherDocuments.model.count({ transaction: otherTransaction })).toBe(1);
        expect((await otherDocuments.model.findByPk(1, { transaction: otherTransaction })).getDataValue('name')).toBe(
          'Other original',
        );
      } finally {
        await finish(transaction);
        await finish(otherTransaction);
        await otherDb.close();
      }
      expect((await documents.model.findByPk(1)).getDataValue('name')).toBe('Original');
    },
  );
  it('rejects reentrant flush and preserves the failure', async () => {
    const transaction = await begin();
    try {
      await expect(
        documents.repository.withDeferredAssociationEvents(transaction, async (flush) => {
          db.on('documents.afterUpdateWithAssociations', flush);
          await documents.repository.update({ filterByTk: 1, values: { name: 'Changed' }, transaction });
          await flush();
        }),
      ).rejects.toThrow(/scope/i);
      expect(transaction.finished).toBeUndefined();
    } finally {
      await finish(transaction);
    }
  });
  it.each(['create', 'update', 'createMany', 'updateMany'] as const)(
    'rejects %s without its scoped transaction before generating another transaction',
    async (action) => {
      const transaction = await begin();
      const generate = vi
        .spyOn(db.sequelize, 'transaction')
        .mockRejectedValue(new Error('Unexpected transaction generation'));
      try {
        await documents.repository.withDeferredAssociationEvents(transaction, async () => {
          await expect(
            documents.repository[action]({
              filterByTk: 1,
              values: { name: 'Wrong' },
              records: [{ id: 1, name: 'Wrong' }],
            }),
          ).rejects.toThrow(/original transaction/i);
        });
        expect(generate).not.toHaveBeenCalled();
        expect((await documents.model.findByPk(1, { transaction })).getDataValue('name')).toBe('Original');
      } finally {
        generate.mockRestore();
        await finish(transaction);
      }
    },
  );
  it.each([false, true])('settles an active flush before scope exit (listener failure: %s)', async (fail) => {
    const transaction = await begin();
    const original = new Error('Delayed listener failure');
    let started: () => void;
    let release: () => void;
    const listenerStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const listenerReleased = new Promise<void>((resolve) => {
      release = resolve;
    });
    let flushing: Promise<void>;
    let settled = false;
    db.on('documents.afterUpdateWithAssociations', async () => {
      started();
      await listenerReleased;
      if (fail) throw original;
    });
    const running = documents.repository.withDeferredAssociationEvents(transaction, async (flush) => {
      await documents.repository.update({ filterByTk: 1, values: { name: 'Changed' }, transaction });
      flushing = flush();
      void flushing.catch(() => {});
      await listenerStarted;
      return 'Complete';
    });
    void running.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    try {
      await listenerStarted;
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(settled).toBe(false);
      release();
      if (fail) await expect(running).rejects.toBe(original);
      else await expect(running).resolves.toBe('Complete');
    } finally {
      release();
      await running.catch(() => {});
      await flushing?.catch(() => {});
      await finish(transaction);
    }
  });
});
