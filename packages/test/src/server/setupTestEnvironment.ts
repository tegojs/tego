import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import TachybaseGlobal from '@tachybase/globals';

export interface ServerTestEnvironmentOptions {
  workspaceRoot?: string;
  pluginPaths?: string[];
  packageDirByPluginName?: Record<string, string>;
  disableRuntimePlugins?: boolean;
  disableOtherPlugins?: boolean;
}

const require = createRequire(import.meta.url);

function createTestDbStorage() {
  const testDbName = `test-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`;
  return path.join(os.tmpdir(), 'tego-test', testDbName);
}

function workspacePackageNameByShortName(workspaceRoot: string, name: string, map: Record<string, string>) {
  const candidates = [map[name], `module-${name}`, `plugin-${name}`].filter(Boolean);
  for (const packageDir of candidates) {
    const packageJsonPath = path.resolve(workspaceRoot, 'packages', packageDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = require(packageJsonPath);
      return packageJson.name;
    }
  }
  return null;
}

function workspacePackageDirByPackageName(workspaceRoot: string, packageName?: string) {
  if (!packageName) {
    return null;
  }

  const packageDir = packageName.replace('@tachybase/', '');
  const packageJsonPath = path.resolve(workspaceRoot, 'packages', packageDir, 'package.json');
  return fs.existsSync(packageJsonPath) ? packageDir : null;
}

function patchPluginRuntime(core: any, workspaceRoot: string) {
  if (core.Plugin.prototype.__serverTestEnvironmentPatched) {
    return;
  }

  const originalLoadCollections = core.Plugin.prototype.loadCollections;

  core.Plugin.prototype.loadCollections = async function loadWorkspaceCollections() {
    const packageDir = this.options?.workspaceSource
      ? workspacePackageDirByPackageName(workspaceRoot, this.options?.packageName)
      : null;
    if (!packageDir) {
      return originalLoadCollections.call(this);
    }

    const directory = path.resolve(workspaceRoot, 'packages', packageDir, 'src/server/collections');
    if (!fs.existsSync(directory)) {
      return;
    }

    await this.db.import({
      directory,
      from: this.options.packageName,
    });
  };

  core.Plugin.prototype.__serverTestEnvironmentPatched = true;
}

function patchPluginManager(
  core: any,
  options: Required<Pick<ServerTestEnvironmentOptions, 'packageDirByPluginName'>> & ServerTestEnvironmentOptions,
) {
  const PluginManager = core.PluginManager;
  if (PluginManager.__serverTestEnvironmentPatched) {
    return;
  }

  const workspaceRoot = options.workspaceRoot || process.cwd();
  const resolvePlugin = PluginManager.resolvePlugin.bind(PluginManager);
  const workspaceSourcePackages = new Set<string>();

  PluginManager.getPackageName = async (name: string) =>
    workspacePackageNameByShortName(workspaceRoot, name, options.packageDirByPluginName) || name;

  PluginManager.getPackageJson = async (packageName: string) => {
    const packageDir = workspacePackageDirByPackageName(workspaceRoot, packageName);
    if (packageDir) {
      return require(path.resolve(workspaceRoot, 'packages', packageDir, 'package.json'));
    }
    return require(require.resolve(path.join(packageName, 'package.json')));
  };

  PluginManager.resolvePlugin = async (pluginName: any, isUpgrade = false, isPkg = false) => {
    if (typeof pluginName !== 'string') {
      return pluginName;
    }

    const packageName = isPkg ? pluginName : await PluginManager.getPackageName(pluginName);
    const packageDir = workspaceSourcePackages.has(packageName)
      ? workspacePackageDirByPackageName(workspaceRoot, packageName)
      : null;
    if (!packageDir) {
      return resolvePlugin(pluginName, isUpgrade, isPkg);
    }

    const pluginModule = await import(
      pathToFileURL(path.resolve(workspaceRoot, 'packages', packageDir, 'src/server/index.ts')).href
    );
    return pluginModule.default;
  };

  if (options.disableRuntimePlugins) {
    PluginManager.prototype.initRuntimePlugins = async function initNoRuntimePlugins() {
      this['_initRuntimePlugins'] = true;
    };
  }

  if (options.disableOtherPlugins) {
    PluginManager.prototype.initOtherPlugins = async function initNoOtherPlugins() {
      this['_initOtherPlugins'] = true;
    };
  }

  PluginManager.prototype.initPresetPlugins = async function initWorkspacePresetPlugins() {
    if (this['_initPresetPlugins']) {
      return;
    }

    for (const plugin of this.options.plugins || []) {
      const [pluginName, pluginOptions = {}] = Array.isArray(plugin) ? plugin : [plugin];
      const packageName =
        typeof pluginName === 'string'
          ? workspacePackageNameByShortName(workspaceRoot, pluginName, options.packageDirByPluginName)
          : null;
      if (packageName) {
        workspaceSourcePackages.add(packageName);
        await this.add(pluginName, { enabled: true, ...pluginOptions, packageName, workspaceSource: true });
      } else if (typeof pluginName === 'function') {
        await this.add(pluginName, { enabled: true, ...pluginOptions });
      } else {
        await this.add(pluginName, { enabled: true, isPreset: true, ...pluginOptions });
      }
    }

    this['_initPresetPlugins'] = true;
  };

  PluginManager.__serverTestEnvironmentPatched = true;
}

export function setupServerTestEnvironment(options: ServerTestEnvironmentOptions = {}) {
  const workspaceRoot = options.workspaceRoot || process.cwd();
  const pluginPaths = options.pluginPaths || [];
  const packageDirByPluginName = options.packageDirByPluginName || {};
  const settings = require('tego/presets/settings');

  TachybaseGlobal.settings = {
    ...settings,
    env: {
      ...settings.env,
      APP_ENV: 'test',
    },
    logger: {
      ...settings.logger,
      level: 'error',
    },
    database: {
      ...settings.database,
      storage: createTestDbStorage(),
    },
    presets: {
      ...settings.presets,
      runtimePlugins: options.disableRuntimePlugins ? [] : settings.presets.runtimePlugins,
    },
  };

  TachybaseGlobal.getInstance().set('PLUGIN_PATHS', pluginPaths);
  process.env.TEGO_RUNTIME_HOME = path.join(os.tmpdir(), 'test-sqlite');
  process.env.APP_ENV_PATH = process.env.APP_ENV_PATH || '.env.test';

  patchPluginRuntime(require('@tego/core'), workspaceRoot);
  patchPluginManager(require('@tego/core'), {
    ...options,
    workspaceRoot,
    packageDirByPluginName,
  });
}
