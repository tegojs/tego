import fs from 'node:fs/promises';
import net from 'node:net';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { CleanOptions, Collection, SyncOptions } from '@tachybase/database';
import TachybaseGlobal from '@tachybase/globals';
import { Container, fsExists, importModule, isURL } from '@tachybase/utils';

import execa from 'execa';
import fg from 'fast-glob';
import _ from 'lodash';

import Application from '../application';
import { createAppProxy, tsxRerunning } from '../helper';
import { Plugin } from '../plugin';
import { pluginPrefix } from './constants';
import { uploadMiddleware } from './middleware';
import collectionOptions from './options/collection';
import resourceOptions from './options/resource';
import { PluginManagerRepository } from './plugin-manager-repository';
import { PluginData } from './types';
import {
  copyTempPackageToStorageAndLinkToNodeModules,
  downloadAndUnzipToTempDir,
  getNpmInfo,
  getPluginInfoByNpm,
  removeTmpDir,
  updatePluginByCompressedFileUrl,
} from './utils';
import { WebControllerService } from './web-service';

export const sleep = async (timeout = 0) => {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
};

// TODO migrate to utils
export type Constructor<T> = new (...args: any[]) => T;

export interface PluginManagerOptions {
  app: Application;
  plugins?: any[];
}

export interface InstallOptions {
  cliArgs?: any[];
  clean?: CleanOptions | boolean;
  force?: boolean;
  sync?: SyncOptions;
}

export class AddPresetError extends Error {}

export class PluginManager {
  /**
   * @internal
   */
  app: Application;

  /**
   * @internal
   */
  collection: Collection;

  /**
   * @internal
   */
  pluginInstances = new Map<Constructor<Plugin>, Plugin>();

  /**
   * @internal
   */
  pluginAliases = new Map<string, Plugin>();

  /**
   * @internal
   */
  server: net.Server;

  /**
   * @internal
   */
  _repository: PluginManagerRepository;

  /**
   * @internal
   */
  constructor(public options: PluginManagerOptions) {
    this.app = options.app;
    this.app.db.registerRepositories({
      PluginManagerRepository,
    });

    this.collection = this.app.db.collection(collectionOptions);

    this._repository = this.collection.repository as PluginManagerRepository;
    this._repository.setPluginManager(this);
    this.app.resourcer.define(resourceOptions);
    this.app.acl.allow('pm', 'listEnabled', 'public');
    this.app.acl.registerSnippet({
      name: 'pm',
      actions: ['pm:*'],
    });

    this.app.db.addMigrations({
      namespace: 'core/pm',
      directory: resolve(__dirname, '../migrations'),
    });

    this.app.resourcer.use(uploadMiddleware, { tag: 'pmFileUpload' });
  }

  get repository() {
    return this.app.db.getRepository('applicationPlugins') as PluginManagerRepository;
  }

  /**
   * @internal
   */
  static async getPackageJson(packageName: string) {
    const pluginPaths = TachybaseGlobal.getInstance().get<string[]>('PLUGIN_PATHS');
    for (const basePath of pluginPaths) {
      const pkgPath = resolve(basePath, packageName, 'package.json');
      try {
        const realPath = await fs.realpath(pkgPath);
        const data = await fs.readFile(realPath, { encoding: 'utf-8' });
        return JSON.parse(data);
      } catch (err) {
        // 跳过不存在的路径或读取失败的情况
      }
    }
    throw new Error(`package.json for ${packageName} not found in any PLUGIN_PATHS`);
  }

  /**
   * @internal
   */
  static async getPackageName(name: string) {
    const pluginPaths = TachybaseGlobal.getInstance().get<string[]>('PLUGIN_PATHS');
    const prefixes = this.getPluginPkgPrefix();
    for (const prefix of prefixes) {
      for (const basePath of pluginPaths) {
        const pkg = resolve(basePath, `${prefix}${name}`, 'package.json');
        const exists = await fsExists(pkg);
        if (exists) {
          return `${prefix}${name}`;
        }
      }
    }
    throw new Error(`${name} plugin does not exist`);
  }

  /**
   * @internal
   */
  static getPluginPkgPrefix() {
    return pluginPrefix;
  }

  /**
   * @internal
   */
  static async findPackage(name: string) {
    try {
      const packageName = this.getPackageName(name);
      return packageName;
    } catch (error) {
      console.log(`\`${name}\` plugin not found locally`);
      const prefixes = this.getPluginPkgPrefix();
      for (const prefix of prefixes) {
        try {
          const packageName = `${prefix}${name}`;
          console.log(`Try to find ${packageName}`);
          await execa('npm', ['v', packageName, 'versions']);
          console.log(`${packageName} downloading`);
          await execa('pnpm', ['add', packageName, '-W']);
          console.log(`${packageName} downloaded`);
          return packageName;
        } catch (error) {
          continue;
        }
      }
    }
    throw new Error(`No available packages found, ${name} plugin does not exist`);
  }

  /**
   * @internal
   */
  static clearCache(packageName: string) {
    return;
    const packageNamePath = packageName.replace('/', sep);
    Object.keys(require.cache).forEach((key) => {
      if (key.includes(packageNamePath)) {
        delete require.cache[key];
      }
    });
  }

  /**
   * @internal
   */
  static async resolvePlugin(pluginName: string | typeof Plugin, isUpgrade = false, isPkg = false) {
    if (typeof pluginName === 'string') {
      const packageName = isPkg ? pluginName : await this.getPackageName(pluginName);
      this.clearCache(packageName);
      return await importModule(packageName);
    } else {
      return pluginName;
    }
  }

  addPreset(plugin: string | typeof Plugin, options: any = {}) {
    if (this.app.loaded) {
      throw new AddPresetError('must be added before executing app.load()');
    }
    if (!this.options.plugins) {
      this.options.plugins = [];
    }
    this.options.plugins.push([plugin, options]);
  }

  getPlugins() {
    return this.app.pm.pluginInstances;
  }

  getAliases() {
    return this.app.pm.pluginAliases.keys();
  }

  get<T extends Plugin>(name: string): Plugin | undefined;
  get<T extends Plugin>(name: Constructor<T>): T | undefined;
  get<T extends Plugin>(name: string | Constructor<T>): Plugin | undefined;
  get<T extends Plugin>(name: string | Constructor<T>) {
    if (typeof name === 'string') {
      return this.app.pm.pluginAliases.get(name);
    }
    return this.app.pm.pluginInstances.get(name) as T;
  }

  has<T extends Plugin>(name: string | Constructor<T>) {
    if (typeof name === 'string') {
      return this.app.pm.pluginAliases.has(name);
    }
    return this.app.pm.pluginInstances.has(name);
  }

  del<T extends Plugin>(name: string | Constructor<T>) {
    const instance = this.get(name);
    if (instance) {
      this.app.pm.pluginAliases.delete(instance.name);
      this.app.pm.pluginInstances.delete(instance.constructor as Constructor<T>);
    }
  }

  async create(pluginName: string, options?: { forceRecreate?: boolean }) {
    const createPlugin = async (name) => {
      const pluginDir = resolve(process.cwd(), 'packages', name);
      if (options?.forceRecreate) {
        await fs.rm(pluginDir, { recursive: true, force: true });
      }
      await execa('pnpm', ['run', 'tb', 'create-plugin', name]);
    };
    await createPlugin(pluginName);
    try {
      await this.app.db.auth({ retry: 1 });
      const installed = await this.app.isInstalled();
      if (!installed) {
        console.log(`pnpm pm add ${pluginName}`);
        return;
      }
    } catch (error) {
      return;
    }
    this.app.logger.info('attempt to add the plugin to the app');
    let packageName: string;
    try {
      packageName = await PluginManager.getPackageName(pluginName);
    } catch (error) {
      packageName = pluginName;
    }
    const json = await PluginManager.getPackageJson(packageName);
    this.app.logger.info(`add plugin [${packageName}]`, {
      name: pluginName,
      packageName: packageName,
      version: json.version,
    });
    await this.repository.updateOrCreate({
      values: {
        name: pluginName,
        packageName: packageName,
        version: json.version,
      },
      filterKeys: ['name'],
    });
    await sleep(1000);
    await tsxRerunning();
  }

  async add(plugin?: any, options: any = {}, insert = false, isUpgrade = false) {
    if (!isUpgrade && this.has(plugin)) {
      const name = typeof plugin === 'string' ? plugin : plugin.name;
      this.app.logger.warn(`plugin [${name}] added`);
      return;
    }
    if (!options.name && typeof plugin === 'string') {
      options.name = plugin;
    }
    try {
      if (typeof plugin === 'string' && options.name && !options.packageName && !options.isPreset) {
        const packageName = await PluginManager.getPackageName(options.name);
        options['packageName'] = packageName;
      }

      if (options.packageName) {
        const packageJson = await PluginManager.getPackageJson(options.packageName);
        options['packageJson'] = packageJson;
        options['version'] = packageJson.version;
      }
    } catch (error) {
      this.app.logger.error(error);
      // empty
    }
    this.app.logger.debug(`add plugin [${options.name}]`, {
      method: 'add',
      submodule: 'plugin-manager',
      name: options.name,
    });
    let P: any;
    try {
      if (options.isPreset) {
        P = TachybaseGlobal.getInstance().get<Record<string, any>>('PRESETS')[options.name];
      } else {
        P = await PluginManager.resolvePlugin(options.packageName || plugin, isUpgrade, !!options.packageName);
      }
    } catch (error) {
      if (process.env.APP_ENV === 'development') {
        throw error;
      }
      this.app.logger.warn('plugin not found', error);
      return;
    }

    const instance: Plugin = new P(createAppProxy(this.app), options);

    this.pluginInstances.set(P, instance);
    if (options.name) {
      // 禁止子应用显示的插件
      if (this.app.name === 'main' || options.subView) {
        this.pluginAliases.set(options.name, instance);
      }
    }
    if (insert && options.name) {
      await this.repository.updateOrCreate({
        values: {
          ...options,
        },
        filterKeys: ['name'],
      });
    }
    await instance.afterAdd();
  }

  /**
   * @internal
   */
  async initPlugins() {
    await this.initRuntimePlugins();
    await this.initPresetPlugins();
    await this.initOtherPlugins();
  }

  /**
   * @internal
   */
  async loadCommands() {
    this.app.logger.debug('load commands');
    const items = await this.repository.find({
      filter: {
        enabled: true,
      },
    });
    const packageNames: string[] = items.map((item) => item.packageName);
    const source = [];
    const pluginPaths = TachybaseGlobal.getInstance().get<string[]>('PLUGIN_PATHS');
    for (const packageName of packageNames) {
      const file = require.resolve(packageName, { paths: [process.cwd(), ...pluginPaths] });
      const sourceDir = basename(dirname(file)) === 'src' ? 'src' : 'dist';
      const directory = join(
        packageName,
        sourceDir,
        'server/commands/*.' + (basename(dirname(file)) === 'src' ? 'ts' : 'js'),
      );
      source.push(directory.replaceAll(sep, '/'));
    }
    for (const plugin of this.options.plugins || []) {
      if (typeof plugin === 'string') {
        // TODO tachybase 的presets插件处理机制
        if (plugin in TachybaseGlobal.getInstance().get<Record<string, any>>('PRESETS')) {
          continue;
        }
        const packageName = await PluginManager.getPackageName(plugin);
        const file = require.resolve(packageName, { paths: [process.cwd(), ...pluginPaths] });
        const sourceDir = basename(dirname(file)) === 'src' ? 'src' : 'lib';
        const directory = join(packageName, sourceDir, 'server/commands/*.' + (sourceDir === 'src' ? 'ts' : 'js'));
        source.push(directory.replaceAll(sep, '/'));
      }
    }
    for (const basePath of pluginPaths) {
      const files = await fg(source, {
        ignore: ['**/*.d.ts'],
        cwd: basePath,
      });

      for (const file of files) {
        const callback = await importModule(file);
        callback(this.app);
      }
    }
  }

  async load(options: any = {}) {
    // FIXME
    Container.reset();
    Container.set({ id: 'db', value: this.app.db });
    Container.set({ id: 'app', value: createAppProxy(this.app) });
    Container.set({ id: 'logger', value: this.app.logger });
    await Container.get(WebControllerService).load();
    this.app.setMaintainingMessage('loading plugins...');
    const total = this.pluginInstances.size;

    let current = 0;

    for (const [P, plugin] of this.getPlugins()) {
      if (plugin.state.loaded) {
        continue;
      }

      const name = plugin.name || P.name;
      current += 1;

      this.app.setMaintainingMessage(`before load plugin [${name}], ${current}/${total}`);
      if (!plugin.enabled) {
        continue;
      }
      this.app.logger.debug(`before load plugin [${name}]`, { submodule: 'plugin-manager', method: 'load', name });
      await plugin.beforeLoad();
      // beforeLoad features
      for (const feature of plugin.featureInstances) {
        await feature.beforeLoad();
      }
    }

    current = 0;

    for (const [P, plugin] of this.getPlugins()) {
      if (plugin.state.loaded) {
        continue;
      }
      const name = plugin.name || P.name;
      current += 1;
      this.app.setMaintainingMessage(`${this.app.i18n.t('load plugin')} [${name}], ${current}/${total}`);

      if (!plugin.enabled) {
        continue;
      }

      await this.app.emitAsync('beforeLoadPlugin', plugin, options);
      this.app.logger.debug(`load plugin [${name}] `, { submodule: 'plugin-manager', method: 'load', name });
      await plugin.loadCollections();
      await plugin.load();
      plugin.state.loaded = true;
      await this.app.emitAsync('afterLoadPlugin', plugin, options);
      // load features
      for (const feature of plugin.featureInstances) {
        await feature.load();
      }
    }

    this.app.setMaintainingMessage('loaded plugins');
  }

  async install(options: InstallOptions = {}) {
    this.app.setMaintainingMessage('install plugins...');
    const total = this.pluginInstances.size;
    let current = 0;

    this.app.logger.debug('call db.sync()');
    await this.app.db.sync();
    const toBeUpdated = [];

    for (const [P, plugin] of this.getPlugins()) {
      if (plugin.state.installing || plugin.state.installed) {
        continue;
      }

      const name = plugin.name || P.name;
      current += 1;

      if (!plugin.enabled) {
        continue;
      }

      plugin.state.installing = true;
      this.app.setMaintainingMessage(`before install plugin [${name}], ${current}/${total}`);
      await this.app.emitAsync('beforeInstallPlugin', plugin, options);
      this.app.logger.debug(`install plugin [${name}]...`);
      await plugin.install(options);
      toBeUpdated.push(name);
      plugin.state.installing = false;
      plugin.state.installed = true;
      plugin.installed = true;
      this.app.setMaintainingMessage(`after install plugin [${name}], ${current}/${total}`);
      await this.app.emitAsync('afterInstallPlugin', plugin, options);
      // install features
      for (const feature of plugin.featureInstances) {
        await feature.install(options);
      }
    }
    await this.repository.update({
      filter: {
        name: toBeUpdated,
      },
      values: {
        installed: true,
      },
    });
  }

  async enable(name: string | string[]) {
    const pluginNames = _.castArray(name);
    this.app.logger.debug(`enabling plugin ${pluginNames.join(',')}`);
    this.app.setMaintainingMessage(`enabling plugin ${pluginNames.join(',')}`);
    const toBeUpdated = [];
    for (const pluginName of pluginNames) {
      const plugin = this.get(pluginName);
      if (!plugin) {
        throw new Error(`${pluginName} plugin does not exist`);
      }
      if (plugin.enabled) {
        continue;
      }
      await this.app.emitAsync('beforeEnablePlugin', pluginName);
      await plugin.beforeEnable();
      plugin.enabled = true;
      toBeUpdated.push(pluginName);
    }
    if (toBeUpdated.length === 0) {
      return;
    }
    await this.repository.update({
      filter: {
        name: toBeUpdated,
      },
      values: {
        enabled: true,
      },
    });
    try {
      await this.app.reload();
      this.app.logger.debug(`syncing database in enable plugin ${pluginNames.join(',')}...`);
      this.app.setMaintainingMessage(`syncing database in enable plugin ${pluginNames.join(',')}...`);
      await this.app.db.sync();
      for (const pluginName of pluginNames) {
        const plugin = this.get(pluginName);
        if (!plugin.installed) {
          this.app.logger.debug(`installing plugin ${pluginName}...`);
          this.app.setMaintainingMessage(`installing plugin ${pluginName}...`);
          await plugin.install();
          plugin.installed = true;
        }
      }
      await this.repository.update({
        filter: {
          name: toBeUpdated,
        },
        values: {
          installed: true,
        },
      });
      for (const pluginName of pluginNames) {
        const plugin = this.get(pluginName);
        this.app.logger.debug(`emit afterEnablePlugin event...`);
        await plugin.afterEnable();
        await this.app.emitAsync('afterEnablePlugin', pluginName);
        this.app.logger.debug(`afterEnablePlugin event emitted`);
      }
      await this.app.tryReloadOrRestart();
    } catch (error) {
      await this.repository.update({
        filter: {
          name: toBeUpdated,
        },
        values: {
          enabled: false,
          installed: false,
        },
      });
      await this.app.tryReloadOrRestart({
        recover: true,
      });
      throw error;
    }
  }

  async disable(name: string | string[]) {
    const pluginNames = _.castArray(name);
    this.app.logger.debug(`disabling plugin ${pluginNames.join(',')}`);
    this.app.setMaintainingMessage(`disabling plugin ${pluginNames.join(',')}`);
    const toBeUpdated = [];
    for (const pluginName of pluginNames) {
      const plugin = this.get(pluginName);
      if (!plugin) {
        throw new Error(`${pluginName} plugin does not exist`);
      }
      if (!plugin.enabled) {
        continue;
      }
      await this.app.emitAsync('beforeDisablePlugin', pluginName);
      await plugin.beforeDisable();
      plugin.enabled = false;
      toBeUpdated.push(pluginName);
    }
    if (toBeUpdated.length === 0) {
      return;
    }
    await this.repository.update({
      filter: {
        name: toBeUpdated,
      },
      values: {
        enabled: false,
      },
    });
    try {
      await this.app.tryReloadOrRestart();
      for (const pluginName of pluginNames) {
        const plugin = this.get(pluginName);
        this.app.logger.debug(`emit afterDisablePlugin event...`);
        await plugin.afterDisable();
        await this.app.emitAsync('afterDisablePlugin', pluginName);
        this.app.logger.debug(`afterDisablePlugin event emitted`);
      }
    } catch (error) {
      await this.repository.update({
        filter: {
          name: toBeUpdated,
        },
        values: {
          enabled: true,
        },
      });
      await this.app.tryReloadOrRestart({
        recover: true,
      });
      throw error;
    }
  }

  async remove(name: string | string[], options?: { removeDir?: boolean; force?: boolean }) {
    const pluginNames = _.castArray(name);
    const records = pluginNames.map((name) => {
      return {
        name: name,
        packageName: name,
      };
    });
    const removeDir = async () => {
      await Promise.all(
        records.map(async (plugin) => {
          const pluginPaths = TachybaseGlobal.getInstance().get<string[]>('PLUGIN_PATHS');
          for (const basePath of pluginPaths) {
            const dir = resolve(basePath, plugin.packageName);
            try {
              const realDir = await fs.realpath(dir);
              this.app.logger.debug(`rm -rf ${realDir}`);
              await fs.rm(realDir, { force: true, recursive: true });
              return true; // 一旦成功就跳出循环
            } catch (error) {
              // 忽略错误，继续尝试下一个路径
            }
            return false;
          }
        }),
      );
      await execa('pnpm', ['tachybase', 'postinstall']);
    };
    if (options?.force) {
      await this.repository.destroy({
        filter: {
          name: pluginNames,
        },
      });
    } else {
      await this.app.load();
      for (const pluginName of pluginNames) {
        const plugin = this.get(pluginName);
        if (!plugin) {
          continue;
        }
        if (plugin.enabled) {
          throw new Error(`plugin is enabled [${pluginName}]`);
        }
        await plugin.beforeRemove();
      }
      await this.repository.destroy({
        filter: {
          name: pluginNames,
        },
      });
      const plugins: Plugin[] = [];
      for (const pluginName of pluginNames) {
        const plugin = this.get(pluginName);
        if (!plugin) {
          continue;
        }
        plugins.push(plugin);
        this.del(pluginName);
        await plugin.afterRemove();
      }
      if (await this.app.isStarted()) {
        await this.app.tryReloadOrRestart();
      }
    }
    if (options?.removeDir) {
      await removeDir();
    }
    await execa('pnpm', ['tachybase', 'refresh']);
  }

  /**
   * @deprecated
   */
  async loadOne(plugin: Plugin) {
    this.app.setMaintainingMessage(`loading plugin ${plugin.name}...`);
    if (plugin.state.loaded || !plugin.enabled) {
      return;
    }
    const name = plugin.getName();
    await plugin.beforeLoad();

    await this.app.emitAsync('beforeLoadPlugin', plugin, {});
    this.app.logger.debug(`loading plugin...`, { submodule: 'plugin-manager', method: 'loadOne', name });
    await plugin.load();
    plugin.state.loaded = true;
    await this.app.emitAsync('afterLoadPlugin', plugin, {});
    this.app.logger.debug(`after load plugin...`, { submodule: 'plugin-manager', method: 'loadOne', name });

    this.app.setMaintainingMessage(`loaded plugin ${plugin.name}`);
  }

  /**
   * @internal
   */
  async addViaCLI(urlOrName: string, options?: PluginData) {
    if (isURL(urlOrName)) {
      await this.addByCompressedFileUrl({
        ...options,
        compressedFileUrl: urlOrName,
      });
    } else if (await fsExists(urlOrName)) {
      await this.addByCompressedFileUrl({
        ...(options as any),
        compressedFileUrl: urlOrName,
      });
    } else if (options?.registry) {
      if (!options.name) {
        const model = await this.repository.findOne({ filter: { packageName: urlOrName } });
        if (model) {
          options['name'] = model?.name;
        }
        if (!options.name) {
          options['name'] = urlOrName.replace('@tachybase/plugin-', '');
        }
      }
      await this.addByNpm({
        ...(options as any),
        packageName: urlOrName,
      });
    } else {
      const opts = {
        ...options,
      };
      const model = await this.repository.findOne({ filter: { packageName: urlOrName } });
      if (model) {
        opts['name'] = model.name;
      }
      if (!opts['packageName']) {
        opts['packageName'] = urlOrName;
      }
      await this.add(opts['name'] || urlOrName, opts, true);
    }
    await this.app.emitStartedEvent();
    await execa('pnpm', ['tachybase', 'postinstall']);
  }

  /**
   * @internal
   */
  async addByNpm(options: { packageName: string; name?: string; registry: string; authToken?: string }) {
    let { name = '', registry, packageName, authToken } = options;
    name = name.trim();
    registry = registry.trim();
    packageName = packageName.trim();
    authToken = authToken?.trim();
    const { compressedFileUrl } = await getPluginInfoByNpm({
      packageName,
      registry,
      authToken,
    });
    return this.addByCompressedFileUrl({ name, compressedFileUrl, registry, authToken, type: 'npm' });
  }

  /**
   * @internal
   */
  async addByFile(options: { file: string; registry?: string; authToken?: string; type?: string; name?: string }) {
    const { file, authToken } = options;

    const { packageName, tempFile, tempPackageContentDir } = await downloadAndUnzipToTempDir(file, authToken);

    const name = options.name || packageName;

    if (this.has(name)) {
      await removeTmpDir(tempFile, tempPackageContentDir);
      throw new Error(`plugin name [${name}] already exists`);
    }
    await copyTempPackageToStorageAndLinkToNodeModules(tempFile, tempPackageContentDir, packageName);
    return this.add(name, { packageName }, true);
  }

  /**
   * @internal
   */
  async addByCompressedFileUrl(options: {
    compressedFileUrl: string;
    registry?: string;
    authToken?: string;
    type?: string;
    name?: string;
  }) {
    const { compressedFileUrl, authToken } = options;

    const { packageName, tempFile, tempPackageContentDir } = await downloadAndUnzipToTempDir(
      compressedFileUrl,
      authToken,
    );

    const name = options.name || packageName;

    if (this.has(name)) {
      await removeTmpDir(tempFile, tempPackageContentDir);
      throw new Error(`plugin name [${name}] already exists`);
    }
    await copyTempPackageToStorageAndLinkToNodeModules(tempFile, tempPackageContentDir, packageName);
    return this.add(name, { packageName }, true);
  }

  async update(options: PluginData) {
    if (options['url']) {
      options.compressedFileUrl = options['url'];
    }
    if (!options.name) {
      const model = await this.repository.findOne({ filter: { packageName: options.packageName } });
      options['name'] = model.name;
    }
    if (options.compressedFileUrl) {
      await this.upgradeByCompressedFileUrl(options);
    } else {
      await this.upgradeByNpm(options as any);
    }
    const file = resolve(process.cwd(), 'storage/app-upgrading');
    await fs.writeFile(file, '', 'utf-8');
    await this.app.upgrade();
  }

  /**
   * @internal
   */
  async upgradeByNpm(values: PluginData) {
    const name = values.name;
    const plugin = this.get(name);
    if (!this.has(name)) {
      throw new Error(`plugin name [${name}] not exists`);
    }
    if (!plugin.options.packageName || !values.registry) {
      throw new Error(`plugin name [${name}] not installed by npm`);
    }
    const version = values.version?.trim();
    const registry = values.registry?.trim() || plugin.options.registry;
    const authToken = values.authToken?.trim() || plugin.options.authToken;
    const { compressedFileUrl } = await getPluginInfoByNpm({
      packageName: plugin.options.packageName,
      registry: registry,
      authToken: authToken,
      version,
    });
    return this.upgradeByCompressedFileUrl({ compressedFileUrl, name, version, registry, authToken });
  }

  /**
   * @internal
   */
  async upgradeByCompressedFileUrl(options: PluginData) {
    const { name, compressedFileUrl, authToken } = options;
    const data = await this.repository.findOne({ filter: { name } });
    const { version } = await updatePluginByCompressedFileUrl({
      compressedFileUrl,
      packageName: data.packageName,
      authToken: authToken,
    });
    await this.add(name, { version, packageName: data.packageName }, true, true);
  }

  /**
   * @internal
   */
  getNameByPackageName(packageName: string) {
    const prefixes = PluginManager.getPluginPkgPrefix();
    const prefix = prefixes.find((prefix) => packageName.startsWith(prefix));
    if (!prefix) {
      throw new Error(
        `package name [${packageName}] invalid, just support ${prefixes.join(
          ', ',
        )}. You can modify process.env.PLUGIN_PACKAGE_PREFIX add more prefix.`,
      );
    }
    return packageName.replace(prefix, '');
  }

  async list(options: any = {}) {
    const { locale = 'en-US', isPreset = false } = options;
    return Promise.all(
      [...this.getAliases()]
        .map((name) => {
          const plugin = this.get(name);
          if (!isPreset && plugin.options.isPreset) {
            return;
          }
          return plugin.toJSON({ locale });
        })
        .filter(Boolean),
    );
  }

  /**
   * @internal
   */
  async getNpmVersionList(name: string) {
    const plugin = this.get(name);
    const npmInfo = await getNpmInfo(plugin.options.packageName, plugin.options.registry, plugin.options.authToken);
    return Object.keys(npmInfo.versions);
  }

  /**
   * @internal
   */
  async loadPresetMigrations() {
    const migrations = {
      beforeLoad: [],
      afterSync: [],
      afterLoad: [],
    };
    for (const [P, plugin] of this.getPlugins()) {
      if (!plugin.isPreset) {
        continue;
      }
      const { beforeLoad, afterSync, afterLoad } = await plugin.loadMigrations();
      migrations.beforeLoad.push(...beforeLoad);
      migrations.afterSync.push(...afterSync);
      migrations.afterLoad.push(...afterLoad);
    }
    return {
      beforeLoad: {
        up: async () => {
          this.app.logger.debug('run preset migrations(beforeLoad)');
          const migrator = this.app.db.createMigrator({ migrations: migrations.beforeLoad });
          await migrator.up();
        },
      },
      afterSync: {
        up: async () => {
          this.app.logger.debug('run preset migrations(afterSync)');
          const migrator = this.app.db.createMigrator({ migrations: migrations.afterSync });
          await migrator.up();
        },
      },
      afterLoad: {
        up: async () => {
          this.app.logger.debug('run preset migrations(afterLoad)');
          const migrator = this.app.db.createMigrator({ migrations: migrations.afterLoad });
          await migrator.up();
        },
      },
    };
  }

  /**
   * @internal
   */
  async loadOtherMigrations() {
    const migrations = {
      beforeLoad: [],
      afterSync: [],
      afterLoad: [],
    };
    for (const [P, plugin] of this.getPlugins()) {
      if (plugin.isPreset) {
        continue;
      }
      if (!plugin.enabled) {
        continue;
      }
      const { beforeLoad, afterSync, afterLoad } = await plugin.loadMigrations();
      migrations.beforeLoad.push(...beforeLoad);
      migrations.afterSync.push(...afterSync);
      migrations.afterLoad.push(...afterLoad);
    }
    return {
      beforeLoad: {
        up: async () => {
          this.app.logger.debug('run others migrations(beforeLoad)');
          const migrator = this.app.db.createMigrator({ migrations: migrations.beforeLoad });
          await migrator.up();
        },
      },
      afterSync: {
        up: async () => {
          this.app.logger.debug('run others migrations(afterSync)');
          const migrator = this.app.db.createMigrator({ migrations: migrations.afterSync });
          await migrator.up();
        },
      },
      afterLoad: {
        up: async () => {
          this.app.logger.debug('run others migrations(afterLoad)');
          const migrator = this.app.db.createMigrator({ migrations: migrations.afterLoad });
          await migrator.up();
        },
      },
    };
  }

  /**
   * @internal
   */
  async loadPresetPlugins() {
    await this.initPresetPlugins();
    await this.load();
  }

  async upgrade() {
    this.app.logger.info('run upgrade');
    const toBeUpdated = [];
    for (const [P, plugin] of this.getPlugins()) {
      if (plugin.state.upgraded) {
        continue;
      }
      if (!plugin.enabled) {
        continue;
      }
      if (!plugin.isPreset && !plugin.installed) {
        this.app.logger.info(`install built-in plugin [${plugin.name}]`);
        await plugin.install();
        toBeUpdated.push(plugin.name);
      }
      this.app.logger.debug(`upgrade plugin [${plugin.name}]`);
      await plugin.upgrade();
      for (const feature of plugin.featureInstances) {
        await feature.upgrade();
      }
      plugin.state.upgraded = true;
    }
    await this.repository.update({
      filter: {
        name: toBeUpdated,
      },
      values: {
        installed: true,
      },
    });
  }

  /**
   * @internal
   */
  async initOtherPlugins() {
    if (this['_initOtherPlugins']) {
      return;
    }
    await this.repository.init();
    this['_initOtherPlugins'] = true;
  }

  /**
   * @internal
   */
  async initPresetPlugins() {
    if (this['_initPresetPlugins']) {
      return;
    }
    for (const plugin of this.options.plugins) {
      const [p, opts = {}] = Array.isArray(plugin) ? plugin : [plugin];
      await this.add(p, { enabled: true, isPreset: true, ...opts });
    }
    this['_initPresetPlugins'] = true;
  }

  /**
   * @internal
   */
  async initRuntimePlugins() {
    if (this['_initRuntimePlugins']) {
      return;
    }
    if (process.env.RUNTIME_PLUGINS) {
      const runtimePlugins = process.env.RUNTIME_PLUGINS.split(',');
      for (const plugin of runtimePlugins) {
        await this.add(plugin, { enabled: true });
      }
    }

    this['_initRuntimePlugins'] = true;
  }
}

export default PluginManager;
