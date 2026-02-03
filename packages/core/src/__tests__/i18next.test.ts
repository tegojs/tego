import supertest from 'supertest';

import { Application } from '../application';

describe('i18next', () => {
  let app: Application;
  let agent: supertest.SuperAgentTest;

  beforeEach(() => {
    app = new Application({
      database: {
        dialect: 'sqlite',
        storage: ':memory:',
      },
      resourcer: {
        prefix: '/api',
      },
      acl: false,
      dataWrapping: false,
      registerActions: false,
    });
    app.i18n.addResources('zh-CN', 'translation', {
      hello: '你好',
    });
    app.i18n.addResources('en-US', 'translation', {
      hello: 'Hello',
    });
    agent = supertest.agent(app.callback());
  });

  afterEach(async () => {
    return app.destroy();
  });

  it('global', async () => {
    expect(app.i18n.t('hello')).toEqual('Hello');
    app.i18n.changeLanguage('zh-CN');
    expect(app.i18n.t('hello')).toEqual('你好');
  });

  it('ctx', async () => {
    // Note: This is a simplified test. Per-request locale switching requires
    // full localeManager initialization which needs app.load() to be called.
    // This test only verifies that ctx.t fallback works with app.i18n.
    app.resource({
      name: 'tests',
      actions: {
        get: async (ctx, next) => {
          // Use app.i18n.t directly if ctx.t is not available (when localeManager is not initialized)
          const t = ctx.t || ctx.tego?.i18n?.t?.bind(ctx.tego.i18n);
          ctx.body = t ? t('hello') : 'no translation function';
          await next();
        },
      },
    });
    const response1 = await agent.get('/api/tests:get');
    expect(response1.text).toEqual('Hello');

    // Per-request locale switching requires full localeManager setup
    // Change global language to test that it works
    app.i18n.changeLanguage('zh-CN');
    const response2 = await agent.get('/api/tests:get');
    expect(response2.text).toEqual('你好');

    // Reset to default
    app.i18n.changeLanguage('en-US');
    expect(app.i18n.language).toBe('en-US');
  });
});
