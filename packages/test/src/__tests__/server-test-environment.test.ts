import path from 'node:path';
import TachybaseGlobal from '@tachybase/globals';

import { describe, expect, it } from 'vitest';

import { setupServerTestEnvironment } from '../server/setupTestEnvironment';

describe('setupServerTestEnvironment', () => {
  it('configures an isolated sqlite test environment', async () => {
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
