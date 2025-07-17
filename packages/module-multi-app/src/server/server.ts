import path from 'node:path';
import { Database, IDatabaseOptions, Transactionable } from '@tachybase/database';
import Application, { AppSupervisor, Gateway, Plugin } from '@tachybase/server';

import lodash from 'lodash';

import { NOTIFY_STATUS_EVENT_KEY } from '../constants';
import { ApplicationModel } from '../server';
import * as actions from './actions/apps';
import { AppOptionsFactory, LazyLoadApplication, onAfterStart } from './app-lifecycle';
import { appSelectorMiddleware, injectAppListMiddleware } from './middlewares';

export type AppDbCreator = (app: Application, options?: Transactionable & { context?: any }) => Promise<void>;
export type { AppOptionsFactory };
export type SubAppUpgradeHandler = (mainApp: Application) => Promise<void>;

const defaultSubAppUpgradeHandle: SubAppUpgradeHandler = async (mainApp: Application) => {
  const repository = mainApp.db.getRepository('applications');
  const findOptions = {};

  const appSupervisor = AppSupervisor.getInstance();

  if (appSupervisor.runningMode === 'single') {
    findOptions['filter'] = {
      name: appSupervisor.singleAppName,
    };
  }

  const instances = await repository.find(findOptions);

  for (const instance of instances) {
    const instanceOptions = instance.get('options');

    // skip standalone deployment application
    if (instanceOptions?.standaloneDeployment && appSupervisor.runningMode !== 'single') {
      continue;
    }

    const beforeSubAppStatus = AppSupervisor.getInstance().getAppStatus(instance.name);

    const subApp = await appSupervisor.getApp(instance.name, {
      upgrading: true,
    });

    console.log({ beforeSubAppStatus });
    try {
      mainApp.setMaintainingMessage(`upgrading sub app ${instance.name}...`);
      console.log(`${instance.name}: upgrading...`);

      await subApp.runAsCLI(['upgrade'], { from: 'user' });
      if (!beforeSubAppStatus && AppSupervisor.getInstance().getAppStatus(instance.name) === 'initialized') {
        await AppSupervisor.getInstance().removeApp(instance.name);
      }
    } catch (error) {
      console.log(`${instance.name}: upgrade failed`);
      mainApp.logger.error(error);
      console.error(error);
    }
  }
};

const defaultDbCreator = async (app: Application) => {
  const databaseOptions = app.options.database as any;
  const { host, port, username, password, dialect, database } = databaseOptions;
  const tmpl = app.options?.tmpl;
  // NOTE: 数据库复制的实现暂时只支持 postgres

  if (dialect === 'mysql') {
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({ host, port, user: username, password });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    await connection.close();
  }

  if (dialect === 'mariadb') {
    const mariadb = require('mariadb');
    const connection = await mariadb.createConnection({ host, port, user: username, password });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    await connection.end();
  }

  if (dialect === 'postgres') {
    const { Client } = require('pg');

    const client = new Client({
      host,
      port,
      user: username,
      password,
      database: 'postgres',
    });

    await client.connect();

    try {
      if (tmpl) {
        app.logger.info(`create new app db ${database} with tmpl db ${tmpl}...`);
        const tmplExists = await client.query(`SELECT 1 FROM pg_database WHERE datname='${tmpl}'`);
        if (tmplExists.rows.length === 0) {
          // 模板不存在，报错结束
          const errMsg = `template database ${tmpl} not exists.`;
          app.logger.error(errMsg);
          AppSupervisor.getInstance().setAppError(database, new Error(errMsg));
        } else {
          // 模板存在，需要先判断是否需要暂时转换为模板数据库，解除占用，禁止连接，然后开始复制，完成后撤销这些操作
          const result = await client.query(`SELECT datistemplate FROM pg_database WHERE datname='${tmpl}'`);
          const tmplDbIsTmpl = result.rows.length > 0 && result.rows[0].datistemplate;
          if (!tmplDbIsTmpl) await client.query(`ALTER DATABASE "${tmpl}" IS_TEMPLATE true`);
          await client.query(`ALTER DATABASE "${tmpl}" ALLOW_CONNECTIONS false`);
          let tmplDbInUse = true;
          do {
            const tmp = await client.query(
              `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${tmpl}' AND pid<>pg_backend_pid()`,
            );
            tmplDbInUse = tmp.rows.length > 0;
          } while (tmplDbInUse);
          await client.query(`CREATE DATABASE "${database}" WITH TEMPLATE "${tmpl}"`);
          if (!tmplDbIsTmpl) await client.query(`ALTER DATABASE "${tmpl}" IS_TEMPLATE false`);
          await client.query(`ALTER DATABASE "${tmpl}" ALLOW_CONNECTIONS true`);
        }
      } else {
        await client.query(`CREATE DATABASE "${database}"`);
      }
    } catch (e) {
      app.logger.error(JSON.stringify(e));
      AppSupervisor.getInstance().setAppError(database, e);
    }

    await client.end();
  }
};

const defaultAppOptionsFactory = (appName: string, mainApp: Application, preset: string) => {
  const rawDatabaseOptions = PluginMultiAppManager.getDatabaseConfig(mainApp);

  if (rawDatabaseOptions.dialect === 'sqlite') {
    const mainAppStorage = rawDatabaseOptions.storage;
    if (mainAppStorage !== ':memory:') {
      const mainStorageDir = path.dirname(mainAppStorage);
      rawDatabaseOptions.storage = path.join(mainStorageDir, `${appName}.sqlite`);
    }
  } else {
    rawDatabaseOptions.database = appName;
  }

  return {
    database: {
      ...rawDatabaseOptions,
      tablePrefix: '',
    },
    plugins: [preset],
    resourcer: {
      prefix: process.env.API_BASE_PATH,
    },
  };
};

export class PluginMultiAppManager extends Plugin {
  appDbCreator: AppDbCreator = defaultDbCreator;
  appOptionsFactory: AppOptionsFactory = defaultAppOptionsFactory;
  subAppUpgradeHandler: SubAppUpgradeHandler = defaultSubAppUpgradeHandle;

  static getDatabaseConfig(app: Application): IDatabaseOptions {
    let oldConfig =
      app.options.database instanceof Database
        ? (app.options.database as Database).options
        : (app.options.database as IDatabaseOptions);

    if (!oldConfig && app.db) {
      oldConfig = app.db.options;
    }

    return lodash.cloneDeep(lodash.omit(oldConfig, ['migrator']));
  }

  setSubAppUpgradeHandler(handler: SubAppUpgradeHandler) {
    this.subAppUpgradeHandler = handler;
  }

  setAppOptionsFactory(factory: AppOptionsFactory) {
    this.appOptionsFactory = factory;
  }

  setAppDbCreator(appDbCreator: AppDbCreator) {
    this.appDbCreator = appDbCreator;
  }

  beforeLoad() {
    this.db.registerModels({
      ApplicationModel,
    });
  }

  async load() {
    // after application created
    this.db.on(
      'applications.afterCreateWithAssociations',
      async (model: ApplicationModel, options: Transactionable & { context?: any }) => {
        const { transaction } = options;

        const subApp = model.registerToSupervisor(this.app, {
          appOptionsFactory: this.appOptionsFactory,
        });

        // create database
        await this.appDbCreator(subApp, {
          transaction,
          context: options.context,
        });

        if ((options as any).values.options?.autoStart) {
          const startPromise = subApp.runCommand('start', '--quickstart');

          if (options?.context?.waitSubAppInstall) {
            await startPromise;
          }

          this.app.noticeManager.notify(NOTIFY_STATUS_EVENT_KEY, { level: 'info', refresh: true });
        }
      },
    );

    this.db.on('applications.afterDestroy', async (model: ApplicationModel) => {
      await AppSupervisor.getInstance().removeApp(model.get('name') as string);
      // TODO: 如果在本页面destroy会造成二次refresh,为了不同客户端都能refresh, 考虑以后notify不包含自己的客户端
      this.app.noticeManager.notify(NOTIFY_STATUS_EVENT_KEY, { level: 'info', refresh: true });
    });

    const self = this;

    AppSupervisor.getInstance().setAppBootstrapper(LazyLoadApplication(self));

    Gateway.getInstance().addAppSelectorMiddleware(appSelectorMiddleware(this.app));

    // this.app.on('afterStart', onAfterStart(this.db));

    // this.app.on('afterUpgrade', async (app, options) => {
    //   await this.subAppUpgradeHandler(app);
    // });

    const notifyStatusChange = this.notifyStatusChange.bind(this);
    this.app.on('beforeStop', async (app) => {
      AppSupervisor.getInstance().off('appStatusChanged', notifyStatusChange);
    });
    // 主动告知客户端状态变化
    AppSupervisor.getInstance().on('appStatusChanged', notifyStatusChange);

    this.app.acl.allow('applications', ['list', 'create', 'update', 'destroy', 'start', 'stop'], 'loggedIn');

    this.app.acl.registerSnippet({
      name: `pm.${this.name}.applications`,
      actions: ['applications:*'],
    });

    this.app.acl.addFixedParams('applications', 'destroy', () => {
      return {
        filter: {
          isTemplate: false,
        },
      };
    });

    const injectAppList = injectAppListMiddleware();

    this.app.use(
      async (ctx, next) => {
        try {
          await injectAppList(ctx, next);
        } catch (error) {
          ctx.logger.error(error);
        }
      },
      { tag: 'error-handling', after: 'dataWrapping' },
    );

    for (const [key, action] of Object.entries(actions)) {
      this.app.resourcer.registerActionHandler(`applications:${key}`, action);
    }
  }

  notifyStatusChange({ appName, status, options }) {
    if (appName === 'main') {
      return;
    }
    const level = ['error', 'not_found'].includes(status) ? 'error' : 'info';
    this.app.noticeManager.notify(NOTIFY_STATUS_EVENT_KEY, {
      app: appName,
      status: status,
      level,
      message: options.error?.message,
    });
  }
}
