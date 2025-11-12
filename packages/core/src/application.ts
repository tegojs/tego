import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';
import { basename, resolve } from 'node:path';
import { RecordableHistogram } from 'node:perf_hooks';
import { EventEmitter } from 'node:stream';
import { registerActions } from '@tachybase/actions';
import { actions as authActions, AuthManager, AuthManagerOptions } from '@tachybase/auth';
import { Cache, CacheManager, CacheManagerOptions } from '@tachybase/cache';
import { DataSourceManager, SequelizeDataSource } from '@tachybase/data-source';
import Database, { CollectionOptions, IDatabaseOptions } from '@tachybase/database';
import {
  createLogger,
  createSystemLogger,
  getLoggerFilePath,
  LoggerOptions,
  RequestLoggerOptions,
  SystemLogger,
  SystemLoggerOptions,
} from '@tachybase/logger';
import { ResourceOptions, Resourcer } from '@tachybase/resourcer';
import {
  applyMixins,
  AsyncEmitter,
  Constructable,
  getCurrentStacks,
  importModule,
  Toposort,
  ToposortOptions,
} from '@tachybase/utils';
import { Container } from '@tego/di';

import { Command, CommanderError, CommandOptions, ParseOptions } from 'commander';
import { globSync } from 'glob';
import { i18n, InitOptions } from 'i18next';
import Koa from 'koa';
import lodash from 'lodash';
import _ from 'lodash';
import { nanoid } from 'nanoid';
import semver from 'semver';
import winston from 'winston';
import WebSocket from 'ws';

import packageJson from '../package.json';
import { createACL } from './acl';
import AesEncryptor from './aes-encryptor';
import { AppCommand } from './app-command';
import { AppSupervisor } from './app-supervisor';
import { createCacheManager } from './cache';
import { registerCli } from './commands';
import { CronJobManager } from './cron/cron-job-manager';
import { Environment } from './environment';
import { ApplicationNotInstall } from './errors/application-not-install';
import { EventBus } from './event-bus';
import { Gateway } from './gateway';
import {
  createAppProxy,
  createI18n,
  createResourcer,
  enablePerfHooks,
  getCommandFullName,
  registerMiddlewares,
} from './helper';
import { ApplicationVersion } from './helpers/application-version';
import { Locale } from './locale';
import { MainDataSource } from './main-data-source';
import { parseVariables } from './middlewares';
import { dataTemplate } from './middlewares/data-template';
import { NoticeManager } from './notice';
import { Plugin } from './plugin';
import { InstallOptions, PluginManager } from './plugin-manager';
import { createPubSubManager, PubSubManager, PubSubManagerOptions } from './pub-sub-manager';
import { SyncMessageManager } from './sync-message-manager';

// WebSocket 事件类型
type WSEventType = 'close' | 'error' | 'message' | 'connection';

// WebSocket 事件处理函数类型
type WSEventHandler = (ws: WebSocket & { id: string }, ...args: any[]) => Promise<void> | void;

// 每种事件类型的处理函数集合
interface WSEventHandlers {
  [eventType: string]: Set<WSEventHandler>;
}

export { Logger } from 'winston';

export type PluginType = string | typeof Plugin;
export type PluginConfiguration = PluginType | [PluginType, any];

declare module '@tachybase/resourcer' {
  interface ResourcerContext {
    app?: Tego;
  }
}

export interface ResourcerOptions {
  prefix?: string;
}

export interface AppLoggerOptions {
  request: RequestLoggerOptions;
  system: SystemLoggerOptions;
}

export interface TegoOptions {
  database?: IDatabaseOptions | Database;
  cacheManager?: CacheManagerOptions;
  resourcer?: ResourcerOptions;
  pubSubManager?: PubSubManagerOptions;
  syncMessageManager?: any;
  bodyParser?: any;
  cors?: any;
  dataWrapping?: boolean;
  registerActions?: boolean;
  i18n?: i18n | InitOptions;
  plugins?: PluginConfiguration[];
  acl?: boolean;
  logger?: AppLoggerOptions;
  pmSock?: string;
  name?: string;
  authManager?: AuthManagerOptions;
  perfHooks?: boolean;
  tmpl?: any;
}

/**
 * @deprecated Use TegoOptions instead
 */
export type ApplicationOptions = TegoOptions;

declare module 'koa' {
  interface DefaultState {
    currentUser?: any;
  }
}

declare module 'koa' {
  interface ExtendableContext {
    tego: Tego;
    db: Database;
    cache: Cache;
    resourcer: Resourcer;
    i18n: any;
    reqId: string;
    logger: winston.Logger;

    [key: string]: any;
  }
}

interface ActionsOptions {
  resourceName?: string;
  resourceNames?: string[];
}

interface StartOptions {
  cliArgs?: any[];
  dbSync?: boolean;
  checkInstall?: boolean;
  quickstart?: boolean;
  reload?: boolean;
  recover?: boolean;
}

type MaintainingStatus = 'command_begin' | 'command_end' | 'command_running' | 'command_error';

export type MaintainingCommandStatus = {
  command: {
    name: string;
  };
  status: MaintainingStatus;
  error?: Error;
};

export class Tego extends EventEmitter implements AsyncEmitter {
  /**
   * @internal
   */
  stopped = false;
  /**
   * @internal
   */
  ready = false;

  /**
   * Event bus for application-wide events
   */
  public eventBus: EventBus;

  /**
   * Dependency injection container
   */
  public container: Container;

  /**
   * @internal
   */
  public rawOptions: TegoOptions;
  /**
   * @internal
   */
  public activatedCommand: {
    name: string;
  } = null;
  /**
   * @internal
   */
  public running = false;
  /**
   * @internal
   */
  public perfHistograms = new Map<string, RecordableHistogram>();
  /**
   * @internal
   */
  public pubSubManager: PubSubManager;
  public syncMessageManager: SyncMessageManager;

  protected plugins = new Map<string, Plugin>();
  protected _appSupervisor: AppSupervisor = AppSupervisor.getInstance();
  protected _started: boolean;
  protected _logger: SystemLogger;
  private _authenticated = false;
  private _maintaining = false;
  private _maintainingCommandStatus: MaintainingCommandStatus;
  private _maintainingStatusBeforeCommand: MaintainingCommandStatus | null;
  private _actionCommand: Command;
  private _noticeManager: NoticeManager;
  private _koa = new Koa();
  static KEY_CORE_APP_PREFIX = 'KEY_CORE_APP_';
  private currentId = nanoid();
  public modules: Record<string, any> = {};
  private _middleware = new Toposort<Koa.Middleware>();
  public middlewareSourceMap: WeakMap<Function, string> = new WeakMap();

  // WebSocket 事件处理器集合
  private wsEventHandlers: WSEventHandlers = {
    close: new Set(),
    error: new Set(),
    message: new Set(),
    connection: new Set(),
  };

  constructor(public options: TegoOptions) {
    super();
    this.context.reqId = randomUUID();
    this.rawOptions = this.name === 'main' ? lodash.cloneDeep(options) : {};

    // Initialize DI container
    this.container = Container.of(this.name || 'main');

    // Initialize EventBus
    this.eventBus = new EventBus();

    this.init();

    this._appSupervisor.addApp(this);
    this._noticeManager = new NoticeManager(this);

    // Register core services in DI container
    this.registerCoreServices();

    // TODO implements more robust event emitters
    this.setMaxListeners(100);

    // 初始化 WebSocket 事件处理
    this.initWSEventHandlers();
  }

  get noticeManager() {
    return this._noticeManager;
  }

  /**
   * @deprecated
   */
  get context() {
    return this._koa.context;
  }

  protected _loaded: boolean;

  /**
   * @internal
   */
  get loaded() {
    return this._loaded;
  }

  private _maintainingMessage: string;

  /**
   * @internal
   */
  get maintainingMessage() {
    return this._maintainingMessage;
  }

  private _env: Environment;

  get environment() {
    return this._env;
  }

  protected _aesEncryptor: AesEncryptor;

  get aesEncryptor() {
    return this._aesEncryptor;
  }

  protected _cronJobManager: CronJobManager;

  get cronJobManager() {
    return this._cronJobManager;
  }

  get mainDataSource() {
    return this.dataSourceManager?.dataSources.get('main') as SequelizeDataSource;
  }

  get db(): Database {
    if (!this.mainDataSource) {
      return null;
    }

    // @ts-ignore
    return this.mainDataSource.collectionManager.db;
  }

  get logger() {
    return this._logger;
  }

  get resourcer() {
    return this.mainDataSource.resourceManager;
  }

  protected _cacheManager: CacheManager;

  get cacheManager() {
    return this._cacheManager;
  }

  protected _cache: Cache;

  get cache() {
    return this._cache;
  }

  /**
   * @internal
   */
  set cache(cache: Cache) {
    this._cache = cache;
  }

  protected _cli: AppCommand;

  get cli() {
    return this._cli;
  }

  protected _i18n: i18n;

  get i18n() {
    return this._i18n;
  }

  protected _pm: PluginManager;

  get pm() {
    return this._pm;
  }

  get acl() {
    return this.mainDataSource.acl;
  }

  protected _authManager: AuthManager;

  get authManager() {
    return this._authManager;
  }

  protected _locales: Locale;

  /**
   * This method is deprecated and should not be used.
   * Use {@link #localeManager} instead.
   * @deprecated
   */
  get locales() {
    return this._locales;
  }

  get localeManager() {
    return this._locales;
  }

  protected _version: ApplicationVersion;

  get version() {
    return this._version;
  }

  get name() {
    return this.options.name || 'main';
  }

  protected _dataSourceManager: DataSourceManager;

  get dataSourceManager() {
    return this._dataSourceManager;
  }

  /**
   * @internal
   */
  getMaintaining() {
    return this._maintainingCommandStatus;
  }

  /**
   * @internal
   */
  setMaintaining(_maintainingCommandStatus: MaintainingCommandStatus) {
    this._maintainingCommandStatus = _maintainingCommandStatus;

    this.emit('maintaining', _maintainingCommandStatus);

    if (_maintainingCommandStatus.status === 'command_end') {
      this._maintaining = false;
      return;
    }

    this._maintaining = true;
  }

  /**
   * @internal
   */
  setMaintainingMessage(message: string) {
    this._maintainingMessage = message;

    this.emit('maintainingMessageChanged', {
      message: this._maintainingMessage,
      maintainingStatus: this._maintainingCommandStatus,
    });
  }

  /**
   * This method is deprecated and should not be used.
   * Use {@link #this.version.get()} instead.
   * @deprecated
   */
  getVersion() {
    return packageJson.version;
  }

  use(middleware: Koa.Middleware, options?: ToposortOptions) {
    this.middlewareSourceMap.set(middleware, getCurrentStacks());
    this._middleware.add(middleware, options);
    this._koa.middleware = this._middleware.nodes;
    return this;
  }

  /**
   * @internal
   */
  callback() {
    return this._koa.callback();
  }

  /**
   * This method is deprecated and should not be used.
   * Use {@link #this.db.collection()} instead.
   * @deprecated
   */
  collection(options: CollectionOptions) {
    return this.db.collection(options);
  }

  /**
   * This method is deprecated and should not be used.
   * Use {@link #this.resourcer.define()} instead.
   * @deprecated
   */
  resource(options: ResourceOptions) {
    return this.resourcer.define(options);
  }

  /**
   * This method is deprecated and should not be used.
   * Use {@link #this.resourcer.registerActions()} instead.
   * @deprecated
   */
  actions(handlers: any, options?: ActionsOptions) {
    return this.resourcer.registerActions(handlers);
  }

  command(name: string, desc?: string, opts?: CommandOptions): AppCommand {
    return this.cli.command(name, desc, opts).allowUnknownOption();
  }

  findCommand(name: string): Command {
    return (this.cli as any)._findCommand(name);
  }

  /**
   * @internal
   */
  async reInit() {
    if (!this._loaded) {
      return;
    }

    this.logger.info('app reinitializing');

    if (this.cacheManager) {
      await this.cacheManager.close();
    }

    if (this.pubSubManager) {
      await this.pubSubManager.close();
    }

    const oldDb = this.db;

    this.init();
    if (!oldDb.closed()) {
      await oldDb.close();
    }

    this._loaded = false;
  }

  async load(options?: any) {
    if (this._loaded) {
      return;
    }

    if (options?.reload) {
      this.setMaintainingMessage('app reload');
      this.logger.info(`app.reload()`, { method: 'load' });

      if (this.cacheManager) {
        await this.cacheManager.close();
      }

      const oldDb = this.db;

      this.init();

      if (!oldDb.closed()) {
        await oldDb.close();
      }
    }

    this._aesEncryptor = await AesEncryptor.create(this);

    this._cacheManager = await createCacheManager(this, this.options.cacheManager);

    this.setMaintainingMessage('init plugins');
    await this.pm.initPlugins();

    this.setMaintainingMessage('start load');
    this.setMaintainingMessage('emit beforeLoad');

    if (options?.hooks !== false) {
      await this.emitAsync('tego:beforeLoad', this, options);
    }

    await this.pm.load(options);

    if (options?.sync) {
      await this.db.sync();
    }

    this.setMaintainingMessage('emit afterLoad');
    if (options?.hooks !== false) {
      await this.emitAsync('tego:afterLoad', this, options);
    }
    this._loaded = true;
  }

  async reload(options?: any) {
    this.logger.debug(`start reload`, { method: 'reload' });

    this._loaded = false;

    await this.emitAsync('tego:beforeReload', this, options);

    await this.load({
      ...options,
      reload: true,
    });

    this.logger.debug('emit afterReload', { method: 'reload' });
    this.setMaintainingMessage('emit afterReload');
    await this.emitAsync('tego:afterReload', this, options);
    this.logger.debug(`finish reload`, { method: 'reload' });
  }

  /**
   * This method is deprecated and should not be used.
   * Use {@link this.pm.get()} instead.
   * @deprecated
   */
  getPlugin<P extends Plugin>(name: string | Constructable<P>) {
    return this.pm.get(name) as P;
  }

  /**
   * This method is deprecated and should not be used.
   * Use {@link this.runAsCLI()} instead.
   * @deprecated
   */
  async parse(argv = process.argv) {
    return this.runAsCLI(argv);
  }

  async authenticate() {
    if (this._authenticated) {
      return;
    }
    this._authenticated = true;
    await this.db.auth();
    await this.db.checkVersion();
    await this.db.prepare();
  }

  async runCommand(command: string, ...args: any[]) {
    return await this.runAsCLI([command, ...args], { from: 'user' });
  }

  async runCommandThrowError(command: string, ...args: any[]) {
    return await this.runAsCLI([command, ...args], { from: 'user', throwError: true });
  }

  protected createCLI() {
    const command = new AppCommand('tachybase')
      .usage('[command] [options]')
      .hook('preAction', async (_, actionCommand) => {
        this._actionCommand = actionCommand;
        this.activatedCommand = {
          name: getCommandFullName(actionCommand),
        };

        this.setMaintaining({
          status: 'command_begin',
          command: this.activatedCommand,
        });

        this.setMaintaining({
          status: 'command_running',
          command: this.activatedCommand,
        });

        if (actionCommand['_authenticate']) {
          await this.authenticate();
        }

        if (actionCommand['_preload']) {
          await this.load();
        }
      })
      .hook('postAction', async (_, actionCommand) => {
        if (this._maintainingStatusBeforeCommand?.error && this._started) {
          await this.restart();
        }
      });

    command.exitOverride((err) => {
      if ((err instanceof CommanderError && err.code === 'commander.helpDisplayed') || err.code === 'commander.help') {
        // ✅ 用户只是显示了 help，不需要报错
        return;
      }
      throw err;
    });

    return command;
  }

  /**
   * @internal
   */
  async loadMigrations(options) {
    const { directory, context, namespace } = options;
    const migrations = {
      beforeLoad: [],
      afterSync: [],
      afterLoad: [],
    };
    const extensions = ['js', 'ts'];
    const patten = `${directory}/*.{${extensions.join(',')}}`;
    // NOTE: filter to fix npx run problem
    const files = globSync(patten, {
      ignore: ['**/*.d.ts'],
    }).filter((f) => !f.endsWith('.d.ts'));
    const appVersion = await this.version.get();
    for (const file of files) {
      let filename = basename(file);
      filename = filename.substring(0, filename.lastIndexOf('.')) || filename;
      const Migration = await importModule(file);
      const m = new Migration({ app: this, db: this.db, ...context });
      if (!m.appVersion || semver.satisfies(appVersion, m.appVersion, { includePrerelease: true })) {
        m.name = `${filename}/${namespace}`;
        migrations[m.on || 'afterLoad'].push(m);
      }
    }
    return migrations;
  }

  /**
   * @internal
   */
  async loadCoreMigrations() {
    const migrations = await this.loadMigrations({
      directory: resolve(__dirname, 'migrations'),
      namespace: '@tego/core',
    });
    return {
      beforeLoad: {
        up: async () => {
          this.logger.debug('run core migrations(beforeLoad)');
          const migrator = this.db.createMigrator({ migrations: migrations.beforeLoad });
          await migrator.up();
        },
      },
      afterSync: {
        up: async () => {
          this.logger.debug('run core migrations(afterSync)');
          const migrator = this.db.createMigrator({ migrations: migrations.afterSync });
          await migrator.up();
        },
      },
      afterLoad: {
        up: async () => {
          this.logger.debug('run core migrations(afterLoad)');
          const migrator = this.db.createMigrator({ migrations: migrations.afterLoad });
          await migrator.up();
        },
      },
    };
  }

  /**
   * @internal
   */
  async loadPluginCommands() {
    this.logger.debug('load plugin commands');
    await this.pm.loadCommands();
  }

  /**
   * @internal
   */
  async runAsCLI(argv = process.argv, options?: ParseOptions & { throwError?: boolean; reqId?: string }) {
    if (this.activatedCommand) {
      return;
    }
    if (options.reqId) {
      this.context.reqId = options.reqId;
      this._logger = this._logger.child({ reqId: this.context.reqId });
    }
    this._maintainingStatusBeforeCommand = this._maintainingCommandStatus;

    try {
      const commandName = options?.from === 'user' ? argv[0] : argv[2];
      if (!this.cli.hasCommand(commandName)) {
        await this.pm.loadCommands();
      }
      const command = await this.cli.parseAsync(argv, options);

      this.setMaintaining({
        status: 'command_end',
        command: this.activatedCommand,
      });

      return command;
    } catch (error) {
      this.logger.error('run command error', error);
      if (!this.activatedCommand) {
        this.activatedCommand = {
          name: 'unknown',
        };
      }

      this.setMaintaining({
        status: 'command_error',
        command: this.activatedCommand,
        error,
      });
    } finally {
      const _actionCommand = this._actionCommand;
      if (_actionCommand) {
        const options = _actionCommand['options'];
        _actionCommand['_optionValues'] = {};
        _actionCommand['_optionValueSources'] = {};
        _actionCommand['options'] = [];
        for (const option of options) {
          _actionCommand.addOption(option);
        }
      }
      this._actionCommand = null;
      this.activatedCommand = null;
    }
  }

  async start(options: StartOptions = {}) {
    if (this._started) {
      return;
    }

    this._started = true;

    if (options.checkInstall && !(await this.isInstalled())) {
      throw new ApplicationNotInstall(
        `Application ${this.name} is not installed, Please run 'pnpm tachybase install' command first`,
      );
    }

    this.setMaintainingMessage('starting app...');

    if (this.db.closed()) {
      await this.db.reconnect();
    }

    this.setMaintainingMessage('emit beforeStart');
    await this.emitAsync('tego:beforeStart', this, options);

    this.setMaintainingMessage('emit afterStart');
    await this.emitAsync('tego:afterStart', this, options);
    this.setMaintainingMessage('app started success!');
    await this.emitStartedEvent(options);

    this.stopped = false;
  }

  /**
   * @internal
   */
  async emitStartedEvent(options: StartOptions = {}) {
    await this.emitAsync('tego:started', this, {
      maintainingStatus: lodash.cloneDeep(this._maintainingCommandStatus),
      options,
    });
  }

  async isStarted() {
    return this._started;
  }

  /**
   * @internal
   */
  async tryReloadOrRestart(options: StartOptions = {}) {
    if (this._started) {
      await this.restart(options);
    } else {
      await this.reload(options);
    }
  }

  async restart(options: StartOptions = {}) {
    if (!this._started) {
      return;
    }

    this.logger.info('restarting...');

    this._started = false;
    await this.emitAsync('tego:beforeStop');
    await this.reload(options);
    await this.start(options);
    this.emit('tego:restarted', this, options);
  }

  async stop(options: any = {}) {
    const log =
      options.logging === false
        ? {
            debug() {},
            warn() {},
            info() {},
            error() {},
          }
        : this.logger;
    log.debug('stop app...', { method: 'stop' });
    this.setMaintainingMessage('stopping app...');

    if (this.stopped) {
      log.warn(`app is stopped`, { method: 'stop' });
      return;
    }

    await this.emitAsync('tego:beforeStop', this, options);

    try {
      // close database connection
      // silent if database already closed
      if (!this.db.closed()) {
        log.info(`close db`, { method: 'stop' });
        await this.db.close();
      }
    } catch (e) {
      log.error(e.message, { method: 'stop', err: e.stack });
    }

    if (this.cacheManager) {
      await this.cacheManager.close();
    }

    await this.emitAsync('tego:afterStop', this, options);

    this.stopped = true;
    log.info(`app has stopped`, { method: 'stop' });
    this._started = false;
  }

  async destroy(options: any = {}) {
    this.logger.debug('start destroy app', { method: 'destory' });
    this.setMaintainingMessage('destroying app...');
    await this.emitAsync('tego:beforeDestroy', this, options);
    await this.stop(options);

    this.logger.debug('emit afterDestroy', { method: 'destory' });
    await this.emitAsync('tego:afterDestroy', this, options);

    this.logger.debug('finish destroy app', { method: 'destory' });
  }

  async isInstalled() {
    return (
      (await this.db.collectionExistsInDb('applicationVersion')) || (await this.db.collectionExistsInDb('collections'))
    );
  }

  async install(options: InstallOptions = {}) {
    const reinstall = options.clean || options.force;
    if (reinstall) {
      await this.db.clean({ drop: true });
    }
    if (await this.isInstalled()) {
      this.logger.warn('app is installed');
      return;
    }
    await this.reInit();
    await this.db.sync();
    await this.load({ hooks: false });

    this.logger.debug('emit beforeInstall', { method: 'install' });
    this.setMaintainingMessage('call beforeInstall hook...');
    await this.emitAsync('tego:beforeInstall', this, options);

    await this.pm.install();
    await this.version.update();

    this.logger.debug('emit afterInstall', { method: 'install' });
    this.setMaintainingMessage('call afterInstall hook...');
    await this.emitAsync('tego:afterInstall', this, options);

    if (this._maintainingStatusBeforeCommand?.error) {
      return;
    }

    if (this._started) {
      await this.restart();
    }
  }

  async upgrade(options: any = {}) {
    this.logger.info('upgrading...');
    await this.reInit();
    const migrator1 = await this.loadCoreMigrations();
    await migrator1.beforeLoad.up();
    await this.db.sync();
    await migrator1.afterSync.up();
    await this.pm.initPresetPlugins();
    const migrator2 = await this.pm.loadPresetMigrations();
    await migrator2.beforeLoad.up();
    // load preset plugins
    await this.pm.load();
    await this.db.sync();
    await migrator2.afterSync.up();
    // upgrade preset plugins
    await this.pm.upgrade();
    await this.pm.initOtherPlugins();
    const migrator3 = await this.pm.loadOtherMigrations();
    await migrator3.beforeLoad.up();
    // load other plugins
    await this.load({ sync: true });
    await migrator3.afterSync.up();
    await this.pm.upgrade();
    await migrator1.afterLoad.up();
    await migrator2.afterLoad.up();
    await migrator3.afterLoad.up();
    await this.pm.repository.updateVersions();
    await this.version.update();
    await this.emitAsync('tego:afterUpgrade', this, options);
    await this.restart();
  }

  toJSON() {
    return {
      appName: this.name,
      name: this.name,
    };
  }

  /**
   * @internal
   */
  reInitEvents() {
    for (const eventName of this.eventNames()) {
      for (const listener of this.listeners(eventName)) {
        if (listener['_reinitializable']) {
          this.removeListener(eventName, listener as any);
        }
      }
    }
  }

  createLogger(options: LoggerOptions) {
    const { dirname } = options;
    return createLogger({
      ...options,
      dirname: getLoggerFilePath(this.name || 'main', dirname || ''),
    });
  }

  protected init() {
    const options = this.options;

    this._logger = createSystemLogger({
      dirname: getLoggerFilePath(this.name),
      filename: 'system',
      seperateError: true,
      ...options.logger?.system,
    }).child({
      reqId: this.context.reqId,
      app: this.name,
      module: 'application',
    });

    this.reInitEvents();

    this.plugins = new Map<string, Plugin>();

    if (this.db) {
      this.db.removeAllListeners();
    }

    this.createMainDataSource(options);

    this._env = new Environment();
    this._cronJobManager = new CronJobManager(this);

    this._cli = this.createCLI();
    this._i18n = createI18n(options);
    this.pubSubManager = createPubSubManager(this, options.pubSubManager);
    this.syncMessageManager = new SyncMessageManager(this, options.syncMessageManager);
    this.context.db = this.db;

    this.context.resourcer = this.resourcer;
    this.context.cacheManager = this._cacheManager;
    this.context.cache = this._cache;

    const plugins = this._pm ? this._pm.options.plugins : options.plugins;

    this._pm = new PluginManager({
      app: this,
      plugins: plugins || [],
    });

    this._authManager = new AuthManager({
      authKey: 'X-Authenticator',
      default: 'basic',
      ...this.options.authManager,
    });

    this.resourcer.define({
      name: 'auth',
      actions: authActions,
    });

    this._dataSourceManager.use(this._authManager.middleware(), { tag: 'auth' });
    this.resourcer.use(this._authManager.middleware(), { tag: 'auth' });

    if (this.options.acl !== false) {
      this.resourcer.use(this.acl.middleware(), { tag: 'acl', after: ['auth'] });
    }

    this._dataSourceManager.use(parseVariables, {
      group: 'parseVariables',
      after: 'acl',
    });
    this._dataSourceManager.use(dataTemplate, { group: 'dataTemplate', after: 'acl' });

    this._locales = new Locale(createAppProxy(this));

    if (options.perfHooks) {
      enablePerfHooks(this);
    }

    registerMiddlewares(this, options);

    if (options.registerActions !== false) {
      registerActions(this);
    }

    registerCli(this);

    this._version = new ApplicationVersion(this);

    // Register initialized services in DI container
    this.registerInitializedServices();
  }

  /**
   * Register services that were initialized in init() method
   * @internal
   */
  private registerInitializedServices() {
    const { TOKENS } = require('./tokens');

    // Register Logger
    this.container.set(TOKENS.Logger, this._logger);

    // Register Environment
    this.container.set(TOKENS.Environment, this._env);

    // Register PluginManager
    this.container.set(TOKENS.PluginManager, this._pm);

    // Register CLI
    this.container.set(TOKENS.Command, this._cli);

    // The following services will be moved to module-standard-core plugin
    // For now, register them for backward compatibility

    // Register DataSourceManager
    this.container.set(TOKENS.DataSourceManager, this._dataSourceManager);

    // Register CronJobManager
    this.container.set(TOKENS.CronJobManager, this._cronJobManager);

    // Register I18n
    this.container.set(TOKENS.I18n, this._i18n);

    // Register AuthManager
    this.container.set(TOKENS.AuthManager, this._authManager);

    // Register PubSubManager
    this.container.set(TOKENS.PubSubManager, this.pubSubManager);

    // Register SyncMessageManager
    this.container.set(TOKENS.SyncMessageManager, this.syncMessageManager);

    // Register NoticeManager
    this.container.set(TOKENS.NoticeManager, this._noticeManager);

    // Register AesEncryptor (if initialized)
    if (this._aesEncryptor) {
      this.container.set(TOKENS.AesEncryptor, this._aesEncryptor);
    }

    // Register CacheManager (if initialized)
    if (this._cacheManager) {
      this.container.set(TOKENS.CacheManager, this._cacheManager);
    }
  }

  protected createMainDataSource(options: ApplicationOptions) {
    const mainDataSourceInstance = new MainDataSource({
      name: 'main',
      database: this.createDatabase(options),
      acl: createACL(),
      resourceManager: createResourcer(options),
    });

    this._dataSourceManager = new DataSourceManager();

    this.dataSourceManager.dataSources.set('main', mainDataSourceInstance);
  }

  protected createDatabase(options: ApplicationOptions) {
    const sqlLogger = this.createLogger({
      filename: 'sql',
      level: 'debug',
    });
    const logging = (msg: any) => {
      if (typeof msg === 'string') {
        msg = msg.replace(/[\r\n]/gm, '').replace(/\s+/g, ' ');
      }
      if (msg.includes('INSERT INTO')) {
        msg = msg.substring(0, 2000) + '...';
      }
      sqlLogger.debug({ message: msg, app: this.name, reqId: this.context.reqId });
    };
    const dbOptions = options.database instanceof Database ? options.database.options : options.database;
    const db = new Database({
      ...dbOptions,
      logging: dbOptions.logging ? logging : false,
      migrator: {
        context: { app: this },
      },
      logger: this._logger.child({ module: 'database' }),
    });
    return db;
  }

  /**
   * 初始化 WebSocket 事件处理
   * 注册应用级别的事件，用于与 WSServer 通信
   */
  private initWSEventHandlers() {
    this.on('ws:registerEventHandler', ({ eventType, handler }) => {
      this.registerWSEventHandler(eventType, handler);
    });

    this.on('ws:removeEventHandler', ({ eventType, handler }) => {
      this.removeWSEventHandler(eventType, handler);
    });
  }

  /**
   * 为 WebSocket 事件注册处理函数
   * 这是一个适配器方法，将事件处理函数注册到 Gateway 的 WSServer
   * @param eventType 事件类型
   * @param handler 事件处理函数
   */
  registerWSEventHandler(eventType: WSEventType, handler: WSEventHandler) {
    const gateway = Gateway.getInstance();
    const wsServer = gateway['wsServer'];

    if (wsServer) {
      wsServer.registerAppEventHandler(this.name, eventType, handler);
    }

    return this;
  }

  /**
   * 移除 WebSocket 事件处理函数
   * @param eventType 事件类型
   * @param handler 事件处理函数
   */
  removeWSEventHandler(eventType: WSEventType, handler: WSEventHandler) {
    const gateway = Gateway.getInstance();
    const wsServer = gateway['wsServer'];

    if (wsServer) {
      wsServer.removeAppEventHandler(this.name, eventType, handler);
    }

    return this;
  }

  /**
   * Register core services in the DI container
   * @internal
   */
  private registerCoreServices() {
    const { TOKENS } = require('./tokens');

    // Register Tego itself
    this.container.set(TOKENS.Tego, this);

    // Register EventBus
    this.container.set(TOKENS.EventBus, this.eventBus);

    // Register Logger (will be initialized later in init())
    // Note: Logger is registered after initialization in init() method

    // Register Config
    this.container.set(TOKENS.Config, this.options);

    // Register Environment (will be set after init())
    // Note: Environment is registered after initialization in init() method

    // Register PluginManager (will be set after init())
    // Note: PluginManager is registered after initialization in init() method

    // Register CLI (will be set after init())
    // Note: CLI is registered after initialization in init() method
  }

  /**
   * Emit an event asynchronously using the EventBus
   * @deprecated This method is provided for backward compatibility. Use eventBus.emitAsync instead.
   */
  async emitAsync(event: string | symbol, ...args: any[]): Promise<boolean> {
    await this.eventBus.emitAsync(event.toString(), ...args);
    return true;
  }

  /**
   * Subscribe to an event
   * Delegates to EventBus for new-style events (tego:*, plugin:*)
   * Falls back to EventEmitter for legacy events
   */
  on(event: string | symbol, listener: (...args: any[]) => void): this {
    const eventStr = event.toString();
    if (eventStr.startsWith('tego:') || eventStr.startsWith('plugin:')) {
      this.eventBus.on(eventStr, listener);
    } else {
      super.on(event, listener);
    }
    return this;
  }

  /**
   * Subscribe to an event (one-time)
   * Delegates to EventBus for new-style events (tego:*, plugin:*)
   * Falls back to EventEmitter for legacy events
   */
  once(event: string | symbol, listener: (...args: any[]) => void): this {
    const eventStr = event.toString();
    if (eventStr.startsWith('tego:') || eventStr.startsWith('plugin:')) {
      this.eventBus.once(eventStr, listener);
    } else {
      super.once(event, listener);
    }
    return this;
  }

  /**
   * Unsubscribe from an event
   * Delegates to EventBus for new-style events (tego:*, plugin:*)
   * Falls back to EventEmitter for legacy events
   */
  off(event: string | symbol, listener: (...args: any[]) => void): this {
    const eventStr = event.toString();
    if (eventStr.startsWith('tego:') || eventStr.startsWith('plugin:')) {
      this.eventBus.off(eventStr, listener);
    } else {
      super.off(event, listener);
    }
    return this;
  }
}

// Note: AsyncEmitter mixin is no longer applied. The Tego class now uses EventBus
// directly and implements the AsyncEmitter interface for backward compatibility.
// The on/once/off/emitAsync methods delegate to EventBus for new-style events.

/**
 * @deprecated Use Tego instead
 */
export const Application = Tego;

export default Application;
