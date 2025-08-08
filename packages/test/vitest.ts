import fs from 'node:fs';
import path, { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const __dirname = new URL('.', import.meta.url).pathname;

const relativePathToAbsolute = (relativePath) => {
  return path.resolve(process.cwd(), relativePath);
};

function tsConfigPathsToAlias() {
  const json = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), './tsconfig.paths.json'), { encoding: 'utf8' }));
  const paths = json.compilerOptions.paths;
  const alias = Object.keys(paths).reduce((acc, key) => {
    if (key !== '@@/*') {
      const value = paths[key][0];
      acc.push({
        find: key,
        replacement: value,
      });
    }
    return acc;
  }, []);
  alias.unshift(
    {
      find: '@tachybase/utils/plugin-symlink',
      replacement: 'node_modules/@tachybase/utils/plugin-symlink.js',
    },
    {
      find: '@opentelemetry/resources',
      replacement: 'node_modules/@opentelemetry/resources/build/src/index.js',
    },
  );
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

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      // you can include other reporters, but 'json-summary' is required, json is recommended
      reporter: ['text', 'json-summary', 'json'],
      // If you want a coverage reports even if your tests are failing, include the reportOnFailure option
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
    alias: tsConfigPathsToAlias(),
    projects: [
      {
        root: process.cwd(),
        resolve: {
          mainFields: ['module'],
        },
        extends: true,
        test: {
          setupFiles: resolve(__dirname, './setup/server.ts'),
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
        },
      },
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
          globals: true,
          setupFiles: resolve(__dirname, './setup/client.ts'),
          environment: 'jsdom',
          css: false,
          alias: tsConfigPathsToAlias(),
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
