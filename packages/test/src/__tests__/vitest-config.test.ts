import { describe, expect, it } from 'vitest';

import defaultConfig, { defineTegoVitestConfig } from '../../vitest';

describe('defineTegoVitestConfig', () => {
  it('keeps the default export compatible', () => {
    expect(defaultConfig.test?.projects).toHaveLength(2);
  });

  it('accepts a server setup file for external workspaces', () => {
    const config = defineTegoVitestConfig({
      server: {
        setupFile: '/workspace/app/vitest.setup.server.ts',
      },
    });

    const serverProject = config.test?.projects?.[0] as any;
    expect(config.test?.projects).toHaveLength(2);
    expect(config.test?.alias).toEqual(expect.any(Array));
    expect(serverProject.test.setupFiles).toBe('/workspace/app/vitest.setup.server.ts');
  });
});
