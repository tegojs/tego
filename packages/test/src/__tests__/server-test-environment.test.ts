import Module from 'node:module';
import path from 'node:path';
import TachybaseGlobal from '@tachybase/globals';

import { require as tsxRequire } from 'tsx/cjs/api';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { moduleNotFound } from '../server/errors';
import { setupServerTestEnvironment } from '../server/setupTestEnvironment';

type ModuleLoad = (request: string, parent: NodeJS.Module | null, isMain: boolean) => unknown;

const moduleLoader = Module as typeof Module & { _load?: ModuleLoad };
let restoreModuleLoad: (() => void) | undefined;

/**
 * These tests patch Module._load only on the supported test runtime:
 * Node.js >=20.19.0, matching package.json engines and CI.
 */
function assertSupportedModuleLoadPatch(loader: typeof moduleLoader): asserts loader is typeof Module & {
  _load: ModuleLoad;
} {
  const [major = 0, minor = 0] = process.versions.node.split('.').map(Number);
  const isSupportedNode = major > 20 || (major === 20 && minor >= 19);
  if (!isSupportedNode) {
    throw new Error(`Module._load test patch supports Node.js >=20.19.0; current runtime is ${process.version}`);
  }
  if (typeof loader._load !== 'function') {
    throw new Error('Module._load test patch requires Node.js to expose Module._load as a function');
  }
}

function mockMissingBuiltRuntimePackages(packages = ['@tachybase/globals', '@tego/core']) {
  assertSupportedModuleLoadPatch(moduleLoader);
  const originalLoad = moduleLoader._load;
  const missingPackages = new Set(packages);

  moduleLoader._load = function loadWithMissingBuiltRuntimePackages(request, parent, isMain) {
    if (missingPackages.has(request)) {
      throw moduleNotFound(request);
    }
    return originalLoad.call(this, request, parent, isMain);
  } as ModuleLoad;

  restoreModuleLoad = () => {
    moduleLoader._load = originalLoad;
    restoreModuleLoad = undefined;
  };
}

function loadWorkspaceCore() {
  return tsxRequire(
    path.resolve(process.cwd(), 'packages/core/src/index.ts'),
    path.resolve(process.cwd(), 'package.json'),
  );
}

let originalSettings: typeof TachybaseGlobal.settings;
let originalEnv: NodeJS.ProcessEnv;

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  for (const key of Object.keys(originalEnv)) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

beforeEach(() => {
  originalSettings = structuredClone(TachybaseGlobal.settings);
  originalEnv = { ...process.env };
});

afterEach(() => {
  restoreModuleLoad?.();
  TachybaseGlobal.getInstance().clear();
  TachybaseGlobal.settings = originalSettings;
  restoreEnv();
});

describe.sequential('setupServerTestEnvironment', () => {
  it('configures an isolated sqlite test environment without built globals and core output', async () => {
    mockMissingBuiltRuntimePackages();
    setupServerTestEnvironment({
      workspaceRoot: process.cwd(),
      pluginPaths: [path.resolve(process.cwd(), 'packages')],
      disableRuntimePlugins: true,
      disableOtherPlugins: true,
    });

    expect(TachybaseGlobal.settings.env.APP_ENV).toBe('test');
    expect(TachybaseGlobal.settings.logger.level).toBe('error');
    expect(TachybaseGlobal.settings.database.storage).toContain('tego-test');
    expect(TachybaseGlobal.settings.presets.runtimePlugins).toEqual([]);
    expect(TachybaseGlobal.getInstance().get('PLUGIN_PATHS')).toEqual([path.resolve(process.cwd(), 'packages')]);
  });

  it('updates environment options on subsequent calls', () => {
    const firstPluginPath = path.resolve(process.cwd(), 'packages');
    const secondPluginPath = path.resolve(process.cwd(), 'packages/test');

    setupServerTestEnvironment({
      workspaceRoot: process.cwd(),
      pluginPaths: [firstPluginPath],
      disableRuntimePlugins: true,
    });
    setupServerTestEnvironment({
      workspaceRoot: process.cwd(),
      pluginPaths: [secondPluginPath],
      disableRuntimePlugins: false,
    });

    expect(TachybaseGlobal.getInstance().get('PLUGIN_PATHS')).toEqual([secondPluginPath]);
    expect(TachybaseGlobal.settings.presets.runtimePlugins).toEqual(originalSettings.presets.runtimePlugins);
  });

  it('patches the runtime core plugin manager', async () => {
    mockMissingBuiltRuntimePackages(['@tego/core']);
    setupServerTestEnvironment({
      workspaceRoot: process.cwd(),
      pluginPaths: [path.resolve(process.cwd(), 'packages')],
      packageDirByPluginName: {
        'test-runtime-plugin': 'test',
      },
    });

    const runtimeCore = loadWorkspaceCore();

    await expect(runtimeCore.PluginManager.getPackageName('test-runtime-plugin')).resolves.toBe('@tachybase/test');
  });
});
