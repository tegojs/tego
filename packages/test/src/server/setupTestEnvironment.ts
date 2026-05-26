import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import TachybaseGlobalModule from '@tachybase/globals';

export interface ServerTestEnvironmentOptions {
  workspaceRoot?: string;
  pluginPaths?: string[];
  packageDirByPluginName?: Record<string, string>;
  disableRuntimePlugins?: boolean;
  disableOtherPlugins?: boolean;
}

const runtimeRequire = createRequire(path.resolve(process.cwd(), 'package.json'));
const workspacePluginNameAliases: Record<string, string> = {
  map: 'block-map',
};
const ImportedTachybaseGlobal = (TachybaseGlobalModule as any).getInstance
  ? TachybaseGlobalModule
  : (TachybaseGlobalModule as any).default;
const testUnsafeBuiltinPlugins = new Set(['event-source', 'worker-thread']);

function createRuntimeRequire(workspaceRoot: string) {
  const hostPackageJson = path.resolve(workspaceRoot, 'package.json');
  if (fs.existsSync(hostPackageJson)) {
    return createRequire(hostPackageJson);
  }

  return runtimeRequire;
}

function getTachybaseGlobal(runtimeRequire: NodeJS.Require) {
  const tachybaseGlobalModule = runtimeRequire('@tachybase/globals');
  return tachybaseGlobalModule.getInstance ? tachybaseGlobalModule : tachybaseGlobalModule.default;
}

function getCoreModules(runtimeRequire: NodeJS.Require) {
  const cores = [runtimeRequire('@tego/core')];

  try {
    const serverRequire = createRequire(runtimeRequire.resolve('@tego/server/package.json'));
    cores.push(serverRequire('@tego/core'));
  } catch {
    // @tego/server is optional for client-only test consumers.
  }

  return [...new Set(cores)];
}

function createTestDbStorage() {
  const testDbName = `test-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`;
  return path.join(os.tmpdir(), 'tego-test', testDbName);
}

function workspacePackageNameByShortName(workspaceRoot: string, name: string, map: Record<string, string>) {
  const normalizedName = workspacePluginNameAliases[name] || name;
  const candidates = [map[name], map[normalizedName], `module-${normalizedName}`, `plugin-${normalizedName}`].filter(
    Boolean,
  );
  for (const packageDir of candidates) {
    const packageJsonPath = path.resolve(workspaceRoot, 'packages', packageDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = runtimeRequire(packageJsonPath);
      return packageJson.name;
    }
  }
  return null;
}

function workspacePackageDirByPackageName(
  workspaceRoot: string,
  packageName: string | undefined,
  map: Record<string, string> = {},
) {
  if (!packageName) {
    return null;
  }

  const mappedPackageDir = Object.values(map).find((packageDir) => {
    const packageJsonPath = path.resolve(workspaceRoot, 'packages', packageDir, 'package.json');
    return fs.existsSync(packageJsonPath) && runtimeRequire(packageJsonPath).name === packageName;
  });
  if (mappedPackageDir) {
    return mappedPackageDir;
  }

  const packageDir = packageName.replace('@tachybase/', '');
  const packageJsonPath = path.resolve(workspaceRoot, 'packages', packageDir, 'package.json');
  return fs.existsSync(packageJsonPath) ? packageDir : null;
}

function patchPluginRuntime(core: any, workspaceRoot: string, packageDirByPluginName: Record<string, string>) {
  if (core.Plugin.prototype.__serverTestEnvironmentPatched) {
    return;
  }

  const originalLoadCollections = core.Plugin.prototype.loadCollections;

  core.Plugin.prototype.loadCollections = async function loadWorkspaceCollections() {
    const packageDir = this.options?.workspaceSource
      ? workspacePackageDirByPackageName(workspaceRoot, this.options?.packageName, packageDirByPluginName)
      : null;
    if (!packageDir) {
      return originalLoadCollections.call(this);
    }

    const sourceDirectory = path.resolve(workspaceRoot, 'packages', packageDir, 'src/server/collections');
    const compiledDirectory = path.resolve(workspaceRoot, 'packages', packageDir, 'dist/server/collections');
    const directory = fs.existsSync(compiledDirectory) ? compiledDirectory : sourceDirectory;
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
  options: Required<Pick<ServerTestEnvironmentOptions, 'packageDirByPluginName'>> &
    ServerTestEnvironmentOptions & { settings: any },
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
    const packageDir = workspacePackageDirByPackageName(workspaceRoot, packageName, options.packageDirByPluginName);
    if (packageDir) {
      return runtimeRequire(path.resolve(workspaceRoot, 'packages', packageDir, 'package.json'));
    }
    return runtimeRequire(runtimeRequire.resolve(path.join(packageName, 'package.json')));
  };

  PluginManager.resolvePlugin = async (pluginName: any, isUpgrade = false, isPkg = false) => {
    if (typeof pluginName !== 'string') {
      return pluginName;
    }

    const packageName = isPkg ? pluginName : await PluginManager.getPackageName(pluginName);
    if (workspaceSourcePackages.has(packageName)) {
      const packageDir = workspacePackageDirByPackageName(workspaceRoot, packageName, options.packageDirByPluginName);
      if (packageDir) {
        const sourceEntry = path.resolve(workspaceRoot, 'packages', packageDir, 'src/server/index.ts');
        if (fs.existsSync(sourceEntry)) {
          const mod = await import(pathToFileURL(sourceEntry).href);
          return mod.default || mod;
        }
      }
      return resolvePlugin(packageName, isUpgrade, true);
    }

    return resolvePlugin(pluginName, isUpgrade, isPkg);
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

  const originalAdd = PluginManager.prototype.add;
  PluginManager.prototype.add = async function addWorkspaceSourcePlugin(
    plugin: any,
    pluginOptions: any = {},
    insert = false,
    isUpgrade = false,
  ) {
    if (typeof plugin === 'string' && pluginOptions?.workspaceSource && pluginOptions?.packageName) {
      const packageDir = workspacePackageDirByPackageName(
        workspaceRoot,
        pluginOptions.packageName,
        options.packageDirByPluginName,
      );
      const sourceEntry = packageDir
        ? path.resolve(workspaceRoot, 'packages', packageDir, 'src/server/index.ts')
        : null;
      if (sourceEntry && fs.existsSync(sourceEntry)) {
        const mod = await import(pathToFileURL(sourceEntry).href);
        return originalAdd.call(this, mod.default || mod, pluginOptions, insert, isUpgrade);
      }
    }

    return originalAdd.call(this, plugin, pluginOptions, insert, isUpgrade);
  };

  const originalEnable = PluginManager.prototype.enable;
  PluginManager.prototype.enable = async function enableWorkspacePlugin(name: string | string[]) {
    const normalize = (pluginName: string) => workspacePluginNameAliases[pluginName] || pluginName;
    const normalizedName = Array.isArray(name) ? name.map(normalize) : normalize(name);
    return originalEnable.call(this, normalizedName);
  };

  PluginManager.prototype.initPresetPlugins = async function initWorkspacePresetPlugins() {
    if (this['_initPresetPlugins']) {
      return;
    }

    const addWorkspacePlugin = async (pluginName: any, pluginOptions: any = {}) => {
      const normalizedPluginName =
        typeof pluginName === 'string' ? workspacePluginNameAliases[pluginName] || pluginName : pluginName;
      const packageName =
        typeof pluginName === 'string'
          ? workspacePackageNameByShortName(workspaceRoot, pluginName, options.packageDirByPluginName)
          : null;
      if (packageName) {
        workspaceSourcePackages.add(packageName);
        const sourceEntry = path.resolve(
          workspaceRoot,
          'packages',
          workspacePackageDirByPackageName(workspaceRoot, packageName, options.packageDirByPluginName) || '',
          'src/server/index.ts',
        );
        if (fs.existsSync(sourceEntry)) {
          const mod = await import(pathToFileURL(sourceEntry).href);
          await this.add(mod.default || mod, {
            name: pluginName,
            ...pluginOptions,
            packageName,
            workspaceSource: true,
          });
        } else {
          await this.add(normalizedPluginName, {
            name: pluginName,
            ...pluginOptions,
            packageName,
            workspaceSource: true,
          });
        }
      } else if (typeof pluginName === 'function') {
        await this.add(pluginName, pluginOptions);
      } else {
        await this.add(normalizedPluginName, { name: pluginName, isPreset: true, ...pluginOptions });
      }
    };

    const addTachybasePresetPlugin = async (pluginName: string, pluginOptions: any = {}) => {
      if (testUnsafeBuiltinPlugins.has(pluginName)) {
        return;
      }
      await addWorkspacePlugin(pluginName, { enabled: true, ...pluginOptions });
    };

    const addTachybaseExternalPlugin = async (plugin: any, pluginOptions: any = {}) => {
      const pluginName = typeof plugin === 'string' ? plugin : plugin?.name;
      if (!pluginName || testUnsafeBuiltinPlugins.has(pluginName)) {
        return;
      }
      await addWorkspacePlugin(pluginName, { enabled: !!plugin?.enabledByDefault, ...pluginOptions });
    };

    for (const plugin of this.options.plugins || []) {
      const [pluginName, pluginOptions = {}] = Array.isArray(plugin) ? plugin : [plugin];
      if (pluginName === 'tachybase') {
        for (const builtinPlugin of options.settings?.presets?.builtinPlugins || []) {
          await addTachybasePresetPlugin(builtinPlugin, pluginOptions);
        }
        for (const externalPlugin of options.settings?.presets?.externalPlugins || []) {
          await addTachybaseExternalPlugin(externalPlugin, pluginOptions);
        }
        continue;
      }

      await addWorkspacePlugin(pluginName, { enabled: true, ...pluginOptions });
    }

    this['_initPresetPlugins'] = true;
  };

  PluginManager.__serverTestEnvironmentPatched = true;
  PluginManager.findPackagePatched = true;
}

export function setupServerTestEnvironment(options: ServerTestEnvironmentOptions = {}) {
  const workspaceRoot = options.workspaceRoot || process.cwd();
  const pluginPaths = options.pluginPaths || [];
  const packageDirByPluginName = options.packageDirByPluginName || {};
  const runtimeRequire = createRuntimeRequire(workspaceRoot);
  const TachybaseGlobal = getTachybaseGlobal(runtimeRequire);
  const settings = runtimeRequire('tego/presets/settings');
  const testSettings = {
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

  ImportedTachybaseGlobal.settings = testSettings;
  TachybaseGlobal.settings = testSettings;

  ImportedTachybaseGlobal.getInstance().set('PLUGIN_PATHS', pluginPaths);
  TachybaseGlobal.getInstance().set('PLUGIN_PATHS', pluginPaths);
  process.env.TEGO_RUNTIME_HOME = path.join(os.tmpdir(), 'test-sqlite');
  process.env.APP_ENV_PATH = process.env.APP_ENV_PATH || '.env.test';

  const coreModules = getCoreModules(runtimeRequire);
  for (const core of coreModules) {
    patchPluginRuntime(core, workspaceRoot, packageDirByPluginName);
    patchPluginManager(core, {
      ...options,
      workspaceRoot,
      packageDirByPluginName,
      settings: testSettings,
    });
  }
}
