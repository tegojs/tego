import { DataTypes } from '@tachybase/database';
import { MockServer, mockServer } from '@tachybase/test';

import { vi } from 'vitest';

import Plugin from '../plugin';

describe('app destroy', () => {
  class ApplicationPluginsFooPlugin extends Plugin {
    async load() {
      this.db.getCollection('applicationPlugins').addField('foo', {
        type: 'string',
      });
    }
  }

  let app: MockServer;
  afterEach(async () => {
    if (app) {
      await app.destroy();
    }
  });
  test('case1', async () => {
    app = mockServer({ plugins: [ApplicationPluginsFooPlugin] });
    await app.runCommand('install', ['-f']);
    await app.runCommand('upgrade');
    const exists = await app.db.getCollection('applicationPlugins').getField('foo').existsInDb();
    expect(exists).toBeTruthy();
  });
  test('case2', async () => {
    app = mockServer({ plugins: [ApplicationPluginsFooPlugin] });
    await app.load();
    app.db.addMigration({
      name: 'test',
      up: () => {
        console.log('up...');
      },
    });
    await app.install();
    await app.upgrade();
    const exists = await app.db.getCollection('applicationPlugins').getField('foo').existsInDb();
    expect(exists).toBeTruthy();
  });
  test('case3', async () => {
    app = mockServer({ plugins: [ApplicationPluginsFooPlugin] });
    await app.cleanDb();
    await app.load();
    const tableNameWithSchema = app.db.getCollection('applicationPlugins').getTableNameWithSchema();
    app.db.addMigration({
      name: 'test',
      up: async () => {
        await app.db.sequelize.getQueryInterface().addColumn(tableNameWithSchema, 'foo', {
          type: DataTypes.STRING,
        });
        await app.db.sequelize.getQueryInterface().addConstraint(tableNameWithSchema, {
          type: 'unique',
          fields: ['foo'],
        });
      },
    });
    await app.install();
    await app.upgrade();
    const exists = await app.db.getCollection('applicationPlugins').getField('foo').existsInDb();
    expect(exists).toBeTruthy();
  });
  test('case4', async () => {
    class P extends Plugin {
      async load() {
        this.db.collection({
          name: 'test',
          fields: [],
        });
      }
    }
    app = mockServer({
      plugins: [P],
    });
    await app.runCommand('install', '-f');
    await app.db.getRepository('test').create({
      values: {},
    });
    expect(await app.db.getRepository('test').count()).toBe(1);
    await app.runCommand('install', '-f');
    expect(await app.db.getRepository('test').count()).toBe(0);
  });
  test('app main already exists', async () => {
    mockServer();
    expect(() => mockServer()).toThrow('app main already exists');
  });
  test('command', async () => {
    const loadFn = vi.fn();
    app = mockServer();
    const command = app.command('foo');
    command.command('bar').action(() => loadFn());
    await app.runCommand('foo', 'bar');
    expect(loadFn).toBeCalled();
    expect(loadFn).toBeCalledTimes(1);
  });
});
