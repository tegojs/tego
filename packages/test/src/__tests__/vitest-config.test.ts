import { createRequire } from 'node:module';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { defineTegoVitestConfig } from '../vitest';

const runtimeRequire = createRequire(path.resolve(process.cwd(), 'package.json'));

describe('defineTegoVitestConfig', () => {
  it('keeps the CommonJS package entry compatible', () => {
    const cjsEntry = runtimeRequire(path.resolve(process.cwd(), 'packages/test/vitest.js'));

    expect(cjsEntry.default.test?.projects).toHaveLength(2);
    expect(cjsEntry.defineTegoVitestConfig().test?.projects).toHaveLength(2);
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
