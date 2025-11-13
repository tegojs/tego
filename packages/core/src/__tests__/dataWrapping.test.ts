import TachybaseGlobal from '@tachybase/globals';

import supertest from 'supertest';

import { Application } from '../application';

describe('application', () => {
  let app: Application;
  let agent;

  beforeEach(() => {
    app = new Application({
      database: {
        username: TachybaseGlobal.settings.database.user,
        password: TachybaseGlobal.settings.database.password,
        database: TachybaseGlobal.settings.database.database,
        host: TachybaseGlobal.settings.database.host,
        port: TachybaseGlobal.settings.database.port,
        dialect: TachybaseGlobal.settings.database.dialect,
        dialectOptions: {
          charset: 'utf8mb4',
          collate: 'utf8mb4_unicode_ci',
        },
      },
      acl: false,
      resourcer: {
        prefix: '/api',
      },
      dataWrapping: true,
    });
    app.resourcer.registerActionHandlers({
      list: async (ctx, next) => {
        ctx.body = [1, 2];
        await next();
      },
      get: async (ctx, next) => {
        ctx.body = [3, 4];
        await next();
      },
      'foo2s.bar2s:list': async (ctx, next) => {
        ctx.body = [5, 6];
        await next();
      },
    });
    agent = supertest.agent(app.callback());
  });

  afterEach(async () => {
    return app.destroy();
  });

  it('resourcer.define', async () => {
    app.resourcer.define({
      name: 'test',
    });
    const response = await agent.get('/api/test');
    expect(response.body).toEqual({
      data: [1, 2],
    });
  });
});
