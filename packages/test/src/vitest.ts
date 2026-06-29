import fs from 'node:fs';
import { createRequire } from 'node:module';
import path, { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const runtimeRequire = createRequire(path.resolve(process.cwd(), 'package.json'));
const packageRoot = fs.existsSync(path.resolve(process.cwd(), 'packages/test/package.json'))
  ? path.resolve(process.cwd(), 'packages/test')
  : path.dirname(runtimeRequire.resolve('@tachybase/test/package.json'));

const relativePathToAbsolute = (relativePath) => {
  return path.resolve(process.cwd(), relativePath);
};

function tsConfigPathsToAlias() {
  const alias = [
    {
      find: '@tachybase/utils/plugin-symlink',
      replacement: 'node_modules/@tachybase/utils/plugin-symlink.js',
    },
    {
      find: '@opentelemetry/resources',
      replacement: 'node_modules/@opentelemetry/resources/build/src/index.js',
    },
  ];

  try {
    const json = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), './tsconfig.paths.json'), { encoding: 'utf8' }),
    );
    const paths = json.compilerOptions?.paths || {};
    alias.push(
      ...Object.keys(paths).reduce((acc, key) => {
        if (key !== '@@/*') {
          const value = paths[key]?.[0];
          if (value) {
            acc.push({
              find: key,
              replacement: value,
            });
          }
        }
        return acc;
      }, []),
    );
  } catch {
    // ignore missing or invalid tsconfig.paths.json
  }

  return [
    { find: /^~antd\/(.*)/, replacement: 'antd/$1' },
    ...alias.map((item) => {
      return {
        ...item,
        replacement: relativePathToAbsolute(item.replacement),
      };
    }),
  ];
}

export interface TegoVitestConfigOptions {
  server?: {
    setupFile?: string;
    /** Force CJS entry for @tachybase/test in server tests (avoids ESM createRequire issues). */
    forceCjsEntry?: boolean;
  };
  client?: {
    setupFile?: string;
    /** Override the default client test timeout (ms). */
    testTimeout?: number;
  };
  /** Additional path aliases merged with defaults from tsconfig.paths.json. */
  aliases?: Array<{ find: string | RegExp; replacement: string }>;
}

export function defineTegoVitestConfig(options: TegoVitestConfigOptions = {}) {
  const serverSetupFile = options.server?.setupFile || resolve(packageRoot, './setup/server.ts');
  const clientSetupFiles = [resolve(packageRoot, './setup/client.ts'), options.client?.setupFile].filter(Boolean);
  const mergedAliases = [...(options.aliases || []), ...tsConfigPathsToAlias()];

  const serverProject: any = {
    root: process.cwd(),
    resolve: {
      mainFields: ['module'],
    },
    extends: true,
    test: {
      name: 'server',
      setupFiles: serverSetupFile,
      include: ['packages/**/__tests__/**/*.test.ts', 'apps/**/__tests__/**/*.test.ts'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/lib/**',
        '**/es/**',
        '**/e2e/**',
        '**/__e2e__/**',
        '**/{vitest,commitlint}.config.*',
        'packages/**/{sdk,client,schema,components}/**/__tests__/**/*.{test,spec}.{ts,tsx}',
      ],
      alias: [...mergedAliases],
    },
  };

  if (options.server?.forceCjsEntry) {
    try {
      const testRequire = createRequire(path.resolve(process.cwd(), 'node_modules/@tachybase/test/package.json'));
      const testCjsEntry = testRequire.resolve('@tachybase/test');
      serverProject.test.alias.push({ find: '@tachybase/test', replacement: testCjsEntry });
    } catch {
      // fallback: if @tachybase/test is not resolvable, skip forced CJS entry
    }
  }

  return defineConfig({
    test: {
      testTimeout: 60000,
      hookTimeout: 60000,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary', 'json'],
        reportOnFailure: true,
        thresholds: {
          lines: 60,
          branches: 60,
          functions: 80,
          statements: 80,
        },
      },
      silent: !!process.env.GITHUB_ACTIONS,
      globals: true,
      alias: mergedAliases,
      projects: [
        serverProject,
        {
          // @ts-ignore
          plugins: [react()],
          resolve: {
            mainFields: ['module'],
          },
          define: {
            'process.env.__TEST__': true,
            'process.env.__E2E__': false,
          },
          test: {
            name: 'client',
            globals: true,
            setupFiles: clientSetupFiles,
            environment: 'jsdom',
            css: false,
            alias: mergedAliases,
            testTimeout: options.client?.testTimeout,
            include: ['packages/**/{sdk,client,schema,components}/**/__tests__/**/*.{test,spec}.{ts,tsx}'],
            exclude: [
              '**/node_modules/**',
              '**/dist/**',
              '**/lib/**',
              '**/es/**',
              '**/e2e/**',
              '**/__e2e__/**',
              '**/{vitest,commitlint}.config.*',
            ],
          },
        },
      ],
    },
  });
}

export default defineTegoVitestConfig();
