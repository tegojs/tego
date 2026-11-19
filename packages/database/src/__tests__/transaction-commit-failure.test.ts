import { randomUUID } from 'node:crypto';

import { Transaction } from 'sequelize';

import { Database } from '../database';

const postgresUrl = process.env.TENANT_ACCESS_TEST_DATABASE_URL;

function normalizePostgresHost(hostname: string) {
  return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
}

describe('PostgreSQL test host normalization', () => {
  it.each([
    ['localhost', 'localhost'],
    ['127.0.0.1', '127.0.0.1'],
    ['[::1]', '::1'],
  ])('normalizes %s to %s', (hostname, expected) => {
    expect(normalizePostgresHost(hostname)).toBe(expected);
  });
});

describe.runIf(!!postgresUrl)('transaction commit outcomes', () => {
  let db: Database;
  const schema = `commit_${randomUUID().replaceAll('-', '')}`;
  const parent = `"${schema}"."parents"`;
  const child = `"${schema}"."children"`;

  beforeAll(async () => {
    const connection = new URL(postgresUrl!);
    if (
      !['postgres:', 'postgresql:'].includes(connection.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(connection.hostname) ||
      !/^\/tego_tenant_access_test_[a-f0-9]{10}$/.test(connection.pathname)
    )
      throw new Error('Commit tests require a dedicated local test database');
    db = new Database({
      dialect: 'postgres',
      host: normalizePostgresHost(connection.hostname),
      port: Number(connection.port || 5432),
      database: connection.pathname.slice(1),
      username: decodeURIComponent(connection.username),
      password: decodeURIComponent(connection.password),
      logging: false,
    });
    await db.sequelize.query(`CREATE SCHEMA "${schema}"`);
    await db.sequelize.query(`CREATE TABLE ${parent} (id integer PRIMARY KEY)`);
    await db.sequelize.query(
      `CREATE TABLE ${child} (id integer PRIMARY KEY, parent_id integer REFERENCES ${parent}(id) DEFERRABLE INITIALLY DEFERRED)`,
    );
  });
  beforeEach(async () => {
    await db.sequelize.query(`TRUNCATE ${child}, ${parent}`);
  });
  afterAll(async () => {
    if (!db) return;
    try {
      await db.sequelize.query(`DROP SCHEMA "${schema}" CASCADE`);
    } finally {
      await db.close();
    }
  });
  const begin = () => db.sequelize.transaction();
  const finish = async (transaction: Transaction) => {
    if (!(transaction as Transaction & { finished?: string }).finished) await transaction.rollback();
  };

  it.each([false, true])(
    'never sends success notifications for a rejected COMMIT, throwing hook=%s',
    async (throwing) => {
      const transaction = await begin();
      let calls = 0;
      transaction.afterCommit(() => {
        calls++;
        if (throwing) throw new Error('notification must not run');
      });
      try {
        await db.sequelize.query(`INSERT INTO ${child} VALUES (1, 999)`, { transaction });
        await expect(transaction.commit()).rejects.toMatchObject({ original: { code: '23503' } });
        expect(calls).toBe(0);
        const [rows] = await db.sequelize.query(`SELECT id FROM ${child}`);
        expect(rows).toEqual([]);
      } finally {
        await finish(transaction);
      }
    },
  );

  it('keeps successful hooks ordered, awaited and bound to their committed transaction', async () => {
    const transaction = await begin();
    const observed: string[] = [];
    transaction.afterCommit(async function () {
      expect(this).toBe(transaction);
      const [rows] = await db.sequelize.query(`SELECT id FROM ${parent}`);
      expect(rows).toEqual([{ id: 1 }]);
      observed.push('first');
    });
    transaction.afterCommit(() => {
      observed.push('second');
    });
    try {
      await db.sequelize.query(`INSERT INTO ${parent} VALUES (1)`, { transaction });
      await transaction.commit();
      expect(observed).toEqual(['first', 'second']);
    } finally {
      await finish(transaction);
    }
  });

  it('does not run notifications after rollback', async () => {
    const transaction = await begin();
    let calls = 0;
    transaction.afterCommit(() => {
      calls++;
    });
    await db.sequelize.query(`INSERT INTO ${parent} VALUES (1)`, { transaction });
    await transaction.rollback();
    expect(calls).toBe(0);
    const [rows] = await db.sequelize.query(`SELECT id FROM ${parent}`);
    expect(rows).toEqual([]);
  });

  it('preserves a successful commit even when its notification throws', async () => {
    const transaction = await begin();
    const original = new Error('notification failed');
    transaction.afterCommit(() => {
      throw original;
    });
    try {
      await db.sequelize.query(`INSERT INTO ${parent} VALUES (1)`, { transaction });
      await expect(transaction.commit()).rejects.toBe(original);
      const [rows] = await db.sequelize.query(`SELECT id FROM ${parent}`);
      expect(rows).toEqual([{ id: 1 }]);
    } finally {
      await finish(transaction);
    }
  });

  it('does not discard another transaction notifications when a commit fails', async () => {
    const failed = await begin();
    const successful = await begin();
    const observed: string[] = [];
    failed.afterCommit(() => {
      observed.push('failed');
    });
    successful.afterCommit(() => {
      observed.push('successful');
    });
    try {
      await db.sequelize.query(`INSERT INTO ${child} VALUES (1, 999)`, { transaction: failed });
      await db.sequelize.query(`INSERT INTO ${parent} VALUES (1)`, { transaction: successful });
      await expect(failed.commit()).rejects.toMatchObject({ original: { code: '23503' } });
      await successful.commit();
      expect(observed).toEqual(['successful']);
    } finally {
      await finish(failed);
      await finish(successful);
    }
  });
});
