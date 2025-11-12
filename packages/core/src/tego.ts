import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { Container, ContainerInstance } from '@tego/di';

import { Command, CommandOptions } from 'commander';
import lodash from 'lodash';

import packageJson from '../package.json';
import { AppCommand } from './app-command';
import { Environment } from './environment';
import { EventBus } from './event-bus';
import { ApplicationVersion } from './helpers/application-version';
import { ConsoleLogger, Logger } from './logger';
import { Plugin } from './plugin';
import { InstallOptions, PluginManager } from './plugin-manager';

export type PluginType = string | typeof Plugin;
export type PluginConfiguration = PluginType | [PluginType, any];

export interface TegoOptions {
  name?: string;
  logger?: Record<string, any>;
  plugins?: PluginConfiguration[];
  [key: string]: any; // Allow plugins to extend options
}

/**
 * @deprecated Use TegoOptions instead
 */
export type ApplicationOptions = TegoOptions;

type MaintainingStatus = 'command_begin' | 'command_end' | 'command_running' | 'command_error';

export type MaintainingCommandStatus = {
  command: {
    name: string;
  };
  status: MaintainingStatus;
  error?: Error;
};

/**
 * Tego - Minimal Application Core
 *
 * The core only manages:
 * - Plugin system
 * - Event bus
 * - DI container
 * - Configuration
 * - Environment
 * - CLI
 * - Lifecycle
 *
 * All other services (Database, Resourcer, ACL, etc.) are provided by plugins.
 */
export class Tego extends EventEmitter {
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
  public container: ContainerInstance;

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
   * Request ID for logging context
   */
  public reqId: string;

  protected plugins = new Map<string, Plugin>();
  protected _started: boolean;
  protected _logger: Logger;
  private _maintaining = false;
  private _maintainingCommandStatus: MaintainingCommandStatus;
  private _maintainingStatusBeforeCommand: MaintainingCommandStatus | null;
  private _actionCommand: Command;

  private _env: Environment;
  protected _cli: AppCommand;
  protected _pm: PluginManager;
  protected _version: ApplicationVersion;
  protected _loaded: boolean;
  private _maintainingMessage: string;

  constructor(public options: TegoOptions) {
    super();
    this.reqId = randomUUID();
    this.rawOptions = lodash.cloneDeep(options);

    // Initialize DI container
    this.container = Container.of(this.name || 'main');

    // Initialize EventBus
    this.eventBus = new EventBus();

    // Initialize logger
    this._logger = new ConsoleLogger({ reqId: this.reqId, app: this.name, module: 'tego' });

    // Initialize environment
    this._env = new Environment();

    // Initialize CLI
    this._cli = this.createCLI();

    // Initialize version
    this._version = new ApplicationVersion(this);

    // Initialize plugin manager
    this._pm = new PluginManager({
      app: this,
      plugins: options.plugins || [],
    });

    // Register core services in DI container
    this.registerCoreServices();

    // Set max listeners
    this.setMaxListeners(100);
  }

  get logger() {
    return this._logger;
  }

  setLogger(logger: Logger) {
    const { TOKENS } = require('./tokens');
    this._logger = logger;
    this.container.set({ id: TOKENS.Logger, value: logger });
  }

  get environment() {
    return this._env;
  }

  get cli() {
    return this._cli;
  }

  get pm() {
    return this._pm;
  }

  get version() {
    return this._version;
  }

  get name() {
    return this.options.name || 'main';
  }

  /**
   * @internal
   */
  get loaded() {
    return this._loaded;
  }

  /**
   * @internal
   */
  get maintainingMessage() {
    return this._maintainingMessage;
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
   * @deprecated Use this.version.get() instead
   */
  getVersion() {
    return packageJson.version;
  }

  command(name: string, desc?: string, opts?: CommandOptions): AppCommand {
    return this.cli.command(name, desc, opts).allowUnknownOption();
  }

  findCommand(name: string): Command {
    return (this.cli as any)._findCommand(name);
  }

  async load(options?: any) {
    if (this._loaded) {
      return;
    }

    this.setMaintainingMessage('init plugins');
    await this.pm.initPlugins();

    this.setMaintainingMessage('emit beforeLoad');
    if (options?.hooks !== false) {
      await this.emitAsync('tego:beforeLoad', this, options);
    }

    await this.pm.load(options);

    this.setMaintainingMessage('emit afterLoad');
    if (options?.hooks !== false) {
      await this.emitAsync('tego:afterLoad', this, options);
    }

    this._loaded = true;
  }

  async reload(options?: any) {
    this.logger.debug('start reload', { method: 'reload' });

    this._loaded = false;

    await this.emitAsync('tego:beforeReload', this, options);

    await this.load({
      ...options,
      reload: true,
    });

    this.logger.debug('emit afterReload', { method: 'reload' });
    this.setMaintainingMessage('emit afterReload');
    await this.emitAsync('tego:afterReload', this, options);
    this.logger.debug('finish reload', { method: 'reload' });
  }

  /**
   * @deprecated Use this.pm.get() instead
   */
  getPlugin<P extends Plugin>(name: string) {
    return this.pm.get(name) as P;
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
          name: this.getCommandFullName(actionCommand),
        };

        this.setMaintaining({
          status: 'command_begin',
          command: this.activatedCommand,
        });

        this.setMaintaining({
          status: 'command_running',
          command: this.activatedCommand,
        });

        // Emit event for plugins to handle authentication/preload
        await this.emitAsync('tego:beforeCommand', actionCommand);
      })
      .hook('postAction', async (_, actionCommand) => {
        await this.emitAsync('tego:afterCommand', actionCommand);
      });

    return command;
  }

  private getCommandFullName(command: Command): string {
    const names = [];
    let current = command;
    while (current) {
      if (current.name()) {
        names.unshift(current.name());
      }
      current = current.parent;
    }
    return names.join('.');
  }

  /**
   * @internal
   */
  async runAsCLI(argv = process.argv, options?: any) {
    if (this.activatedCommand) {
      return;
    }

    if (options?.reqId) {
      this.reqId = options.reqId;
      this.setLogger(this._logger.child({ reqId: this.reqId }));
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

      if (options?.throwError) {
        throw error;
      }
    } finally {
      const _actionCommand = this._actionCommand;
      if (_actionCommand) {
        const opts = _actionCommand['options'];
        _actionCommand['_optionValues'] = {};
        _actionCommand['_optionValueSources'] = {};
        _actionCommand['options'] = [];
        for (const option of opts) {
          _actionCommand.addOption(option);
        }
      }
      this._actionCommand = null;
      this.activatedCommand = null;
    }
  }

  async start(options: any = {}) {
    if (this._started) {
      return;
    }

    this._started = true;

    this.setMaintainingMessage('starting app...');
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
  async emitStartedEvent(options: any = {}) {
    await this.emitAsync('tego:started', this, {
      maintainingStatus: lodash.cloneDeep(this._maintainingCommandStatus),
      options,
    });
  }

  async isStarted() {
    return this._started;
  }

  async restart(options: any = {}) {
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
    this.logger.debug('stop app...', { method: 'stop' });
    this.setMaintainingMessage('stopping app...');

    if (this.stopped) {
      this.logger.warn('app is stopped', { method: 'stop' });
      return;
    }

    await this.emitAsync('tego:beforeStop', this, options);

    // Let plugins handle their own cleanup
    await this.emitAsync('tego:stopping', this, options);

    await this.emitAsync('tego:afterStop', this, options);

    this.stopped = true;
    this.logger.info('app has stopped', { method: 'stop' });
    this._started = false;
  }

  async destroy(options: any = {}) {
    this.logger.debug('start destroy app', { method: 'destroy' });
    this.setMaintainingMessage('destroying app...');

    await this.emitAsync('tego:beforeDestroy', this, options);
    await this.stop(options);

    this.logger.debug('emit afterDestroy', { method: 'destroy' });
    await this.emitAsync('tego:afterDestroy', this, options);

    // Destroy DI container
    await this.container.reset();

    this.logger.debug('finish destroy app', { method: 'destroy' });
  }

  async install(options: InstallOptions = {}) {
    this.logger.debug('emit beforeInstall', { method: 'install' });
    this.setMaintainingMessage('call beforeInstall hook...');
    await this.emitAsync('tego:beforeInstall', this, options);

    await this.pm.install(options);
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

    await this.emitAsync('tego:beforeUpgrade', this, options);

    await this.pm.upgrade();
    await this.version.update();

    await this.emitAsync('tego:afterUpgrade', this, options);

    await this.restart();
  }

  toJSON() {
    return {
      name: this.name,
      version: this.getVersion(),
      loaded: this._loaded,
      started: this._started,
    };
  }

  /**
   * Register core services in the DI container
   * @internal
   */
  private registerCoreServices() {
    const { TOKENS } = require('./tokens');

    // Register Tego itself
    this.container.set({ id: TOKENS.Tego, value: this });

    // Register EventBus
    this.container.set({ id: TOKENS.EventBus, value: this.eventBus });

    // Register Logger
    this.container.set({ id: TOKENS.Logger, value: this._logger });

    // Register Config
    this.container.set({ id: TOKENS.Config, value: this.options });

    // Register Environment
    this.container.set({ id: TOKENS.Environment, value: this._env });

    // Register PluginManager
    this.container.set({ id: TOKENS.PluginManager, value: this._pm });

    // Register CLI
    this.container.set({ id: TOKENS.Command, value: this._cli });
  }

  /**
   * Emit an event asynchronously using the EventBus
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

/**
 * @deprecated Use Tego instead
 */
export const Application = Tego;

export default Tego;
