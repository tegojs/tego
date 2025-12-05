import fs from 'node:fs';
import { basename, resolve } from 'node:path';
import { Model, Transactionable } from '@tachybase/database';
import { Container } from '@tachybase/di';
import TachybaseGlobal from '@tachybase/globals';
import { LoggerOptions } from '@tachybase/logger';
import { fsExists, importModule } from '@tachybase/utils';

import { globSync } from 'glob';
import type { ParseKeys, TOptions } from 'i18next';

import { Application } from './application';
import { resolveRequest } from './helper';
import { getExposeChangelogUrl, getExposeReadmeUrl, InstallOptions } from './plugin-manager';
import { checkAndGetCompatible } from './plugin-manager/utils';
import { PubSubManagerPublishOptions } from './pub-sub-manager';

export type { ParseKeys, TOptions } from 'i18next';
export interface PluginInterface {
  beforeLoad?: () => void;

  load();

  getName(): string;
}

export interface PluginOptions {
  activate?: boolean;
  displayName?: string;
  description?: string;
  version?: string;
  enabled?: boolean;
  install?: (this: Plugin) => void;
  load?: (this: Plugin) => void;
  plugin?: typeof Plugin;

  [key: string]: any;
}

export abstract class Plugin implements PluginInterface {
  options: any;
  app: Application;
  features: (typeof Plugin)[];
  featureInstances: Plugin[];

  /**
   * @deprecated
   */
  model: Model;

  /**
   * @internal
   */
  state: any = {};

  /**
   * @internal
   */
  private _sourceDir: string;

  constructor(app: Application, options?: any) {
    this.app = app;
    this.setOptions(options);
    this.features = [];
    this.featureInstances = [];
  }

  addFeature<T extends Plugin>(plugin: new (app: Application, options?: any) => T) {
    this.features.push(plugin);
    this.featureInstances.push(new plugin(this.app, this.options));
  }

  get log() {
    return this.app.logger.child({
      reqId: this.app.context.reqId,
      module: this.name,
    });
  }

  get noticeManager() {
    return this.app.noticeManager;
  }

  get name() {
    return this.options.name as string;
  }

  get pm() {
    return this.app.pm;
  }

  get db() {
    return this.app.db;
  }

  get enabled() {
    return this.options.enabled;
  }

  set enabled(value) {
    this.options.enabled = value;
  }

  get installed() {
    return this.options.installed;
  }

  set installed(value) {
    this.options.installed = value;
  }

  get isPreset() {
    return this.options.isPreset;
  }

  getName() {
    return (this.options as any).name;
  }

  createLogger(options: LoggerOptions) {
    return this.app.createLogger(options);
  }

  afterAdd() {}

  beforeLoad() {}

  async load() {}

  async install(options?: InstallOptions) {}

  async upgrade() {}

  async beforeEnable() {}

  async afterEnable() {}

  async beforeDisable() {}

  async afterDisable() {}

  async beforeRemove() {}

  async afterRemove() {}

  async handleSyncMessage(message: Readonly<any>) {}
  async sendSyncMessage(message: any, options?: PubSubManagerPublishOptions & Transactionable) {
    if (!this.name) {
      throw new Error(`plugin name invalid`);
    }

    try {
      await this.app.syncMessageManager.publish(this.name, message, options);
    } catch (err) {
      this.app.logger.error(err);
    }
  }

  /**
   * @deprecated
   */
  async importCollections(collectionsPath: string) {}

  /**
   * @internal
   */
  setOptions(options: any) {
    this.options = options || {};
  }

  /**
   * @internal
   */
  async loadCommands() {
    if (!this.options.packageName) {
      return;
    }
    const extensions = ['js', 'ts'];
    const directory = resolve(resolveRequest(this.options.packageName), '../../server/commands');
    const patten = `${directory}/*.{${extensions.join(',')}}`;
    const files = globSync(patten, {
      ignore: ['**/*.d.ts'],
    });
    for (const file of files) {
      let filename = basename(file);
      filename = filename.substring(0, filename.lastIndexOf('.')) || filename;
      const callback = await importModule(file);
      callback(this.app);
    }
    if (files.length) {
      this.app.logger.debug(`load commands [${this.name}]`);
    }
  }

  /**
   * @internal
   */
  async loadMigrations() {
    if (!this.options.packageName) {
      return { beforeLoad: [], afterSync: [], afterLoad: [] };
    }
    const directory = resolve(resolveRequest(this.options.packageName), '../../server/migrations').replace(/\\/g, '/');
    return await this.app.loadMigrations({
      directory,
      namespace: this.options.packageName,
      context: {
        plugin: this,
      },
    });
  }

  /**
   * @internal
   */
  async loadCollections() {
    if (!this.options.packageName) {
      // Skip silently for 'tachybase' virtual plugin
      if (this.getName() === 'tachybase') {
        return;
      }
      this.app.logger.warn(
        `[Plugin.loadCollections] packageName not set for plugin ${this.getName()}, skipping loadCollections`,
        {
          submodule: 'Plugin',
          method: 'loadCollections',
        },
      );
      return;
    }
    const resolvedPath = resolveRequest(this.options.packageName);

    // 尝试多个可能的路径：src/server/collections 或 dist/server/collections 或 server/collections
    const possiblePaths = [
      resolve(resolvedPath, '../server/collections'), // src/index.ts -> src/server/collections
      resolve(resolvedPath, '../../server/collections'), // dist/index.js -> <project-root>/server/collections
      resolve(resolvedPath, '../../src/server/collections'), // dist/index.js -> dist/../src/server/collections
    ];

    let directory: string | null = null;
    for (const path of possiblePaths) {
      if (await fsExists(path)) {
        directory = path;
        break;
      }
    }

    this.app.logger.debug(`[Plugin.loadCollections] Loading collections for ${this.getName()}`, {
      submodule: 'Plugin',
      method: 'loadCollections',
      packageName: this.options.packageName,
      resolvedPath,
      collectionsDirectory: directory,
      directoryExists: !!directory,
      triedPaths: possiblePaths,
    });

    if (directory) {
      await this.db.import({
        directory,
        from: this.options.packageName,
      });
      this.app.logger.debug(`[Plugin.loadCollections] Successfully imported collections from ${directory}`, {
        submodule: 'Plugin',
        method: 'loadCollections',
      });
    } else {
      this.app.logger.warn(
        `[Plugin.loadCollections] Collections directory for ${this.options.packageName} not found, skipping import. Notice this may be a mistake.`,
        {
          submodule: 'Plugin',
          method: 'loadCollections',
          packageName: this.options.packageName,
          resolvedPath,
        },
      );
    }
  }

  /**
   * @deprecated
   */
  requiredPlugins() {
    return [];
  }

  t(text: ParseKeys | ParseKeys[], options: TOptions = {}) {
    return this.app.i18n.t(text, { ns: this.options['packageName'], ...(options as any) }) as string;
  }

  /**
   * @experimental
   */
  async toJSON(options: any = {}) {
    const { locale = 'en-US' } = options;
    const { name, packageName, packageJson } = this.options;
    if (!packageName) {
      return {
        ...this.options,
      };
    }

    const results = {
      ...this.options,
      keywords: packageJson.keywords,
      readmeUrl: getExposeReadmeUrl(packageName, locale),
      changelogUrl: getExposeChangelogUrl(packageName),
      displayName: packageJson[`displayName.${locale}`] || packageJson.displayName || name,
      description: packageJson[`description.${locale}`] || packageJson.description,
      homepage: packageJson[`homepage.${locale}`] || packageJson.homepage,
    };

    if (!options.withOutOpenFile) {
      const pluginPaths =
        TachybaseGlobal.getInstance().get<string[]>('PLUGIN_PATHS') ||
        [process.env.NODE_MODULES_PATH, resolve(process.cwd(), 'node_modules')].filter(Boolean); // 过滤 undefined

      let file: string | undefined;

      for (const basePath of pluginPaths) {
        const fullPath = resolve(basePath, packageName);
        try {
          file = await fs.promises.realpath(fullPath);
          break;
        } catch {
          // 不存在，跳过
        }
      }

      if (!file) {
        throw new Error(`Cannot resolve real path for ${packageName} in any PLUGIN_PATHS`);
      }

      return {
        ...results,
        ...(await checkAndGetCompatible(packageName)),
        lastUpdated: (await fs.promises.stat(file)).ctime,
        file,
        updatable: file.startsWith(process.env.PLUGIN_STORAGE_PATH),
      };
    }

    return results;
  }
}

export function InjectedPlugin<T extends Plugin>({
  Services = [],
  Resources = [],
  Controllers = [],
}: {
  Services?: any[];
  Resources?: any[];
  Controllers?: any[];
}) {
  return function (target: { new (...args: any[]): T }, context: ClassDecoratorContext) {
    // TODO fix any

    const originalLoad = target.prototype.load;
    target.prototype.load = async function () {
      const services = Services.map((i) => Container.get<any>(i));
      const resources = Resources.map((i) => Container.get<any>(i));
      await originalLoad.call(this);

      for (const service of services) {
        try {
          await service.load?.();
        } catch (e) {
          this.log.warn('load service error', { name: service.constructor?.name, error: e });
        }
      }

      for (const resource of resources) {
        try {
          await resource.load?.();
        } catch (e) {
          this.log.warn('load resource error', { name: resource.constructor?.name, error: e });
        }
      }
    };

    return target;
  };
}

export default Plugin;
