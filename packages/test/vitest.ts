import fs from 'node:fs';
import path, { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 从当前目录向上查找指定文件
 */
function findFileUpwards(filename: string, startDir = process.cwd()): string | null {
  let currentDir = startDir;

  while (true) {
    const filePath = path.join(currentDir, filename);
    if (fs.existsSync(filePath)) {
      return filePath;
    }

    const parentDir = path.dirname(currentDir);
    // 已经到达文件系统根目录
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}

/**
 * 获取项目根目录（通过查找 tsconfig.paths.json）
 */
function getProjectRoot(): string {
  const tsConfigPath = findFileUpwards('tsconfig.paths.json');
  if (!tsConfigPath) {
    throw new Error('tsconfig.paths.json not found in current directory or any parent directories');
  }
  return path.dirname(tsConfigPath);
}

// 缓存项目根目录，避免重复查找
const projectRoot = getProjectRoot();
const currentWorkDir = process.cwd();

const relativePathToAbsolute = (relativePath) => {
  return path.resolve(projectRoot, relativePath);
};

/**
 * 获取测试文件的 include 模式
 * 如果在子目录运行，只测试当前目录下的文件
 * 如果在项目根目录运行，测试所有包
 */
function getIncludePatterns(patterns: string[]): string[] {
  // 如果当前工作目录就是项目根目录，使用原始模式
  if (currentWorkDir === projectRoot) {
    return patterns;
  }

  // 计算当前工作目录相对于项目根目录的路径
  let relativeWorkDir = path.relative(projectRoot, currentWorkDir);

  // 如果当前目录不在项目根目录下，使用原始模式
  if (relativeWorkDir.startsWith('..')) {
    return patterns;
  }

  // 将 Windows 路径分隔符转换为正斜杠（glob 模式需要）
  relativeWorkDir = relativeWorkDir.replace(/\\/g, '/');

  // 将模式调整为只匹配当前目录下的文件
  return [`${relativeWorkDir}/**/__tests__/**/*.{test,spec}.{ts,tsx}`];
}

function tsConfigPathsToAlias() {
  const tsConfigPath = path.join(projectRoot, 'tsconfig.paths.json');
  const json = JSON.parse(fs.readFileSync(tsConfigPath, { encoding: 'utf8' }));
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
        root: projectRoot,
        resolve: {
          mainFields: ['module'],
        },
        extends: true,
        test: {
          setupFiles: resolve(__dirname, './setup/server.ts'),
          include: getIncludePatterns(['packages/**/__tests__/**/*.test.ts', 'apps/**/__tests__/**/*.test.ts']),
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
          include: getIncludePatterns([
            'packages/**/{sdk,client,schema,components}/**/__tests__/**/*.{test,spec}.{ts,tsx}',
          ]),
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
