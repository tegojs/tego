import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { defineTegoVitestConfig } from '../vitest';

const runtimeRequire = createRequire(path.resolve(process.cwd(), 'package.json'));
const testPackageRoot = path.resolve(process.cwd(), 'packages/test');
let tempPackageRoot: string | undefined;

beforeEach(() => {
  tempPackageRoot = fs.mkdtempSync(path.join(testPackageRoot, `vitest-entry-fixture-${process.pid}-`));
  fs.copyFileSync(path.resolve(testPackageRoot, 'vitest.js'), path.resolve(tempPackageRoot, 'vitest.js'));
  fs.mkdirSync(path.resolve(tempPackageRoot, 'src'));
  fs.copyFileSync(path.resolve(testPackageRoot, 'src/vitest.ts'), path.resolve(tempPackageRoot, 'src/vitest.ts'));
});

afterEach(() => {
  if (tempPackageRoot && fs.existsSync(tempPackageRoot)) {
    fs.rmSync(tempPackageRoot, { recursive: true, force: true });
  }
  tempPackageRoot = undefined;
});

describe('defineTegoVitestConfig', () => {
  it('keeps the CommonJS package entry compatible without built output', () => {
    const cjsEntry = runtimeRequire(path.resolve(tempPackageRoot!, 'vitest.js'));

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
