import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { defineTegoVitestConfig } from '../vitest';

const runtimeRequire = createRequire(path.resolve(process.cwd(), 'package.json'));
const testPackageRoot = path.resolve(process.cwd(), 'packages/test');
const libDir = path.resolve(testPackageRoot, 'lib');
let movedLibDir: string | undefined;

afterEach(() => {
  if (movedLibDir && fs.existsSync(movedLibDir)) {
    fs.renameSync(movedLibDir, libDir);
  }
  movedLibDir = undefined;
});

describe('defineTegoVitestConfig', () => {
  it('keeps the CommonJS package entry compatible without built output', () => {
    if (fs.existsSync(libDir)) {
      movedLibDir = path.join(testPackageRoot, `lib.tmp-vitest-entry-test-${process.pid}-${Date.now()}`);
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

    const serverProject = config.test?.projects?.find((project) => project.test?.name === 'server');
    expect(config.test?.projects).toHaveLength(2);
    expect(config.test?.alias).toEqual(expect.any(Array));
    expect(serverProject).toBeDefined();
    expect(serverProject!.test.setupFiles).toBe('/workspace/app/vitest.setup.server.ts');
  });
});
