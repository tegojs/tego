import { describe, expect, it } from 'vitest';

import defaultConfig, { defineTegoVitestConfig } from '../../vitest';

describe('defineTegoVitestConfig', () => {
  it('keeps the default export compatible', () => {
    expect(defaultConfig.test?.projects).toHaveLength(2);
  });

  it('accepts server setup options for external workspaces', () => {
    const config = defineTegoVitestConfig({
      server: {
        setupOptions: {
          workspaceRoot: '/workspace/app',
          pluginPaths: ['/workspace/app/packages'],
          packageDirByPluginName: {
            users: 'module-user',
          },
          disableRuntimePlugins: true,
          disableOtherPlugins: true,
        },
      },
    });

    expect(config.test?.projects).toHaveLength(2);
    expect(config.test?.alias).toEqual(expect.any(Array));
  });
});
