import fs from 'node:fs';
import path from 'node:path';
import TachybaseGlobal from '@tachybase/globals';

import { afterEach, describe, expect, it } from 'vitest';

import { setupServerTestEnvironment } from '../server/setupTestEnvironment';

const globalsLibDir = path.resolve(process.cwd(), 'packages/globals/lib');
const movedGlobalsLibDir = path.resolve(process.cwd(), 'packages/globals/lib.tmp-server-env-test');

afterEach(() => {
  if (fs.existsSync(movedGlobalsLibDir)) {
    fs.renameSync(movedGlobalsLibDir, globalsLibDir);
  }
});

describe('setupServerTestEnvironment', () => {
  it('configures an isolated sqlite test environment without built globals output', async () => {
    if (fs.existsSync(globalsLibDir)) {
      fs.renameSync(globalsLibDir, movedGlobalsLibDir);
    }
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
});
