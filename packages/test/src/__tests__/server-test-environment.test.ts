import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import TachybaseGlobal from '@tachybase/globals';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setupServerTestEnvironment } from '../server/setupTestEnvironment';

const globalsLibDir = path.resolve(process.cwd(), 'packages/globals/lib');
const coreLibDir = path.resolve(process.cwd(), 'packages/core/lib');
let movedGlobalsLibDir: string;
let movedCoreLibDir: string;

function moveIfExists(from: string, to: string) {
  if (fs.existsSync(from)) {
    fs.renameSync(from, to);
  }
}

function restoreIfMoved(from: string, to: string) {
  if (fs.existsSync(from)) {
    fs.renameSync(from, to);
  }
}

function createTempLibDir(packageName: string) {
  return path.resolve(process.cwd(), 'packages', packageName, `lib.tmp-server-env-test-${process.pid}-${Date.now()}`);
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
  movedGlobalsLibDir = createTempLibDir('globals');
  movedCoreLibDir = createTempLibDir('core');
});

afterEach(() => {
  TachybaseGlobal.getInstance().clear();
  TachybaseGlobal.settings = originalSettings;
  restoreEnv();
  restoreIfMoved(movedGlobalsLibDir, globalsLibDir);
  restoreIfMoved(movedCoreLibDir, coreLibDir);
});

describe.sequential('setupServerTestEnvironment', () => {
  it('configures an isolated sqlite test environment without built globals and core output', async () => {
    moveIfExists(globalsLibDir, movedGlobalsLibDir);
    moveIfExists(coreLibDir, movedCoreLibDir);
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
    setupServerTestEnvironment({
      workspaceRoot: process.cwd(),
      pluginPaths: [path.resolve(process.cwd(), 'packages')],
      packageDirByPluginName: {
        'test-runtime-plugin': 'test',
      },
    });

    const runtimeRequire = createRequire(path.resolve(process.cwd(), 'package.json'));
    const runtimeCore = runtimeRequire('@tego/core');

    await expect(runtimeCore.PluginManager.getPackageName('test-runtime-plugin')).resolves.toBe('@tachybase/test');
  });
});
