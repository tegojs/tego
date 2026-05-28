import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { defineTegoVitestConfig } from '../vitest';

const runtimeRequire = createRequire(path.resolve(process.cwd(), 'package.json'));
const testPackageRoot = path.resolve(process.cwd(), 'packages/test');
const libDir = path.resolve(testPackageRoot, 'lib');
const movedLibDir = path.resolve(testPackageRoot, 'lib.tmp-vitest-entry-test');

afterEach(() => {
  if (fs.existsSync(movedLibDir)) {
    fs.renameSync(movedLibDir, libDir);
  }
});

describe('defineTegoVitestConfig', () => {
  it('keeps the CommonJS package entry compatible without built output', () => {
    if (fs.existsSync(libDir)) {
      fs.renameSync(libDir, movedLibDir);
    }
    const cjsEntry = runtimeRequire(path.resolve(testPackageRoot, 'vitest.js'));

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
