import { createHash } from 'node:crypto';
import {
  cpSync as _cpSync,
  existsSync as _existsSync,
  writeFileSync as _writeFileSync,
  createWriteStream,
  existsSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { Socket } from 'node:net';
import os from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';

import chalk from 'chalk';
import { config } from 'dotenv';
import { execa, Options } from 'execa';
import fastGlob from 'fast-glob';
import packageJson from 'package-json';
import * as tar from 'tar';

import { DEFAULT_DEV_HOST } from './constants';

const require = createRequire(import.meta.url);

export async function fsExists(path: string) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    return false;
  }
}

export function isPackageValid(pkg: string) {
  try {
    require.resolve(pkg);
    return true;
  } catch (error) {
    return false;
  }
}

export async function downloadTar(packageName: string, target: string) {
  const info = await packageJson(packageName, { fullMetadata: true });
  const url = info.dist.tarball;
  const tarballFile = join(target, '..', `${createHash('md5').update(packageName).digest('hex')}-tarball.gz`);
  await mkdir(dirname(tarballFile), { recursive: true });
  const writer = createWriteStream(tarballFile);
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to fetch tarball: ${response.statusText}`);
  }

  // 使用 pipeline 将 response.body 写入文件
  await pipeline(response.body, writer);

  await mkdir(target, { recursive: true });
  await tar.x({
    file: tarballFile,
    gzip: true,
    cwd: target,
    strip: 1,
    k: true,
  });

  await unlink(tarballFile);
}

export function hasCorePackages() {
  const coreDir = resolve(process.cwd(), 'apps/build');
  return existsSync(coreDir);
}

export function hasTsNode() {
  return isPackageValid('tsx');
}

export function isDev() {
  if (process.env.APP_ENV === 'production') {
    return false;
  }
  return hasTsNode();
}

export const isProd = () => {
  const { APP_SERVER_ROOT } = process.env;
  const file = `${APP_SERVER_ROOT}/lib/index.js`;
  if (!existsSync(resolve(process.cwd(), file))) {
    console.log('For production environment, please build the code first.');
    console.log();
    console.log(chalk.yellow('$ pnpm build'));
    console.log();
    process.exit(1);
  }
  return true;
};

export function nodeCheck() {
  if (!hasTsNode()) {
    console.log('Please install all dependencies');
    console.log(chalk.yellow('$ pnpm install'));
    process.exit(1);
  }
}

export function run(command: string, args?: string[], options?: Options<any>) {
  if (command === 'tsx') {
    command = 'node';
    args = ['./node_modules/tsx/dist/cli.mjs'].concat(args || []);
  }
  return execa(command, args, {
    shell: true,
    stdio: 'inherit',
    ...options,
    env: {
      ...process.env,
      ...options?.env,
    },
  });
}

interface IPortReachableOptions {
  timeout: number;
  host: string;
}

export async function isPortReachable(port: string, options: Partial<IPortReachableOptions> = {}) {
  const timeout = options.timeout ?? 1000;
  const host = options.host ?? '';
  const promise = new Promise<void>((resolve, reject) => {
    const socket = new Socket();

    const onError = () => {
      socket.destroy();
      reject();
    };

    socket.setTimeout(timeout);
    socket.once('error', onError);
    socket.once('timeout', onError);

    socket.connect(Number(port), host, () => {
      socket.end();
      resolve();
    });
  });

  try {
    await promise;
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Checks that the specified port (or `APP_PORT` from the environment) is not already in use and exits the process with code 1 if it is.
 *
 * @param opts - Options object.
 * @param opts.port - Port to check; if omitted, `APP_PORT` from the environment is used.
 */
export async function postCheck(opts: { port?: string }) {
  const port = opts.port || process.env.APP_PORT || '';
  const result = await isPortReachable(port);
  if (result) {
    console.error(chalk.red(`post already in use ${port}`));
    process.exit(1);
  }
}

/**
 * Attempts to run the TSX CLI with the given arguments and, if the `tsx` executable is not found, falls back to invoking the TSX CLI module via `node`.
 *
 * If the `tsx` command is missing (ENOENT), the function resolves the TSX CLI entry and runs it with `node`; any other execution errors are propagated.
 *
 * @param argv - Arguments to pass to the TSX CLI
 * @param options - Execution options forwarded to the underlying runner
 */
async function runWithTsx(argv: string[], options?: Options<any>) {
  try {
    // 先尝试使用 tsx 命令（保持原有实现）
    await run('tsx', argv, options);
  } catch (error: any) {
    // 如果 tsx 命令未找到（ENOENT），使用 node 直接调用 tsx CLI 作为后备方案
    // 这样可以确保在所有平台上都能正常工作
    if (error.code === 'ENOENT') {
      // 使用 node 直接调用 tsx 的 CLI 入口点，这样可以正确处理所有 tsx 特定的标志
      const tsxCliPath = require.resolve('tsx/dist/cli.mjs');
      await run('node', [tsxCliPath, ...argv], options);
    } else {
      // 其他错误（如 TypeScript 编译错误、运行时错误等）应该直接抛出，不进行回退
      throw error;
    }
  }
}

/**
 * Trigger the application's server install command using the configured server tsconfig.
 *
 * This reads SERVER_TSCONFIG_PATH and APP_SERVER_ROOT from environment and invokes the install entrypoint of the server.
 *
 * @throws Error when `SERVER_TSCONFIG_PATH` is not set in the environment.
 */
export async function runInstall() {
  const { APP_SERVER_ROOT, SERVER_TSCONFIG_PATH } = process.env;

  if (!SERVER_TSCONFIG_PATH) {
    throw new Error('SERVER_TSCONFIG_PATH is empty.');
  }

  const argv = [
    '--tsconfig',
    SERVER_TSCONFIG_PATH,
    '-r',
    'tsconfig-paths/register',
    `${APP_SERVER_ROOT}/src/index.ts`,
    'install',
    '-s',
  ];
  await run('tsx', argv);
}

/**
 * Invoke a server subcommand via the server's index module with tsconfig paths registration.
 *
 * @param command - The command name to forward to the server (e.g., "start", "install").
 * @param args - Additional command-line arguments to pass to the server command
 * @throws If `SERVER_TSCONFIG_PATH` is not set in the environment
 */
export async function runAppCommand(command: string, args: string[] = []) {
  const { APP_SERVER_ROOT, SERVER_TSCONFIG_PATH } = process.env;

  if (!SERVER_TSCONFIG_PATH) {
    throw new Error('SERVER_TSCONFIG_PATH is not set');
  }

  const argv = [
    '--tsconfig',
    SERVER_TSCONFIG_PATH,
    '-r',
    'tsconfig-paths/register',
    `${APP_SERVER_ROOT}/src/index.ts`,
    command,
    ...args,
  ];
  await run('tsx', argv);
}

/**
 * Logs a standardized "TypeScript compiling..." notice to the console.
 *
 * Prints a green "WAIT: " prefix followed by "TypeScript compiling..." to indicate that TypeScript is currently building.
 */
export function promptForTs() {
  console.log(chalk.green('WAIT: ') + 'TypeScript compiling...');
}

export async function updateJsonFile(target: string, fn: any) {
  const content = await readFile(target, 'utf-8');
  const json = JSON.parse(content);
  await writeFile(target, JSON.stringify(fn(json), null, 2), 'utf-8');
}

export function generateAppDir() {
  const defaultServerRoot = join(process.cwd(), 'node_modules', 'tego');
  const defaultClientRoot = join(process.cwd(), 'apps/web');
  process.env.APP_SERVER_ROOT = process.env.APP_SERVER_ROOT || defaultServerRoot;
  process.env.APP_CLIENT_ROOT = process.env.APP_CLIENT_ROOT || defaultClientRoot;
}

export async function genTsConfigPaths() {
  try {
    unlinkSync(resolve(process.cwd(), 'node_modules/.bin/tsx'));
    symlinkSync(
      resolve(process.cwd(), 'node_modules/tsx/dist/cli.mjs'),
      resolve(process.cwd(), 'node_modules/.bin/tsx'),
      'file',
    );
  } catch (error) {
    //
  }

  const cwd = process.cwd();
  const cwdLength = cwd.length;
  const paths: Record<string, string[]> = {};
  const packages = fastGlob.sync(['apps/*/package.json', 'packages/*/package.json'], {
    absolute: true,
    onlyFiles: true,
  });

  await Promise.all(
    packages.map(async (packageFile) => {
      const packageJsonName = JSON.parse(await readFile(packageFile, 'utf-8')).name;
      const packageDir = dirname(packageFile);
      const relativePath = packageDir
        .slice(cwdLength + 1)
        .split(sep)
        .join('/');
      paths[`${packageJsonName}/client`] = [`${relativePath}/src/client`];
      paths[`${packageJsonName}/package.json`] = [`${relativePath}/package.json`];
      paths[packageJsonName] = [`${relativePath}/src`];
      if (packageJsonName === '@tachybase/test') {
        paths[`${packageJsonName}/server`] = [`${relativePath}/src/server`];
        paths[`${packageJsonName}/e2e`] = [`${relativePath}/src/e2e`];
      }
      if (packageJsonName === '@tachybase/plugin-workflow-test') {
        paths[`${packageJsonName}/e2e`] = [`${relativePath}/src/e2e`];
      }
    }),
  );
  const tsConfigJsonPath = join(cwd, './tsconfig.paths.json');
  const content = { compilerOptions: { paths } };
  writeFileSync(tsConfigJsonPath, JSON.stringify(content, null, 2), 'utf-8');

  return content;
}

export function generatePlaywrightPath(clean = false) {
  try {
    const playwright = resolve(process.env.TEGO_RUNTIME_HOME!, 'storage/playwright/tests');
    if (clean && _existsSync(playwright)) {
      rmSync(dirname(playwright), { force: true, recursive: true });
    }
    if (!_existsSync(playwright)) {
      const testPkg = require.resolve('@tachybase/test/package.json');
      _cpSync(resolve(dirname(testPkg), 'playwright/tests'), playwright, { recursive: true });
    }
  } catch (error) {
    // empty
  }
}

function parseEnv(name: string) {
  if (name === 'DB_UNDERSCORED') {
    if (process.env.DB_UNDERSCORED === 'true') {
      return 'true';
    }
    if (process.env.DB_UNDERSCORED) {
      return 'true';
    }
    return 'false';
  }
}

export function initEnv() {
  const env = {
    APP_ENV: 'development',
    APP_KEY: 'test-jwt-secret',
    APP_PORT: 3000,
    API_BASE_PATH: '/api/',
    DB_DIALECT: 'sqlite',
    DB_STORAGE: 'storage/db/tachybase.sqlite',
    DB_TIMEZONE: '+00:00',
    DB_UNDERSCORED: parseEnv('DB_UNDERSCORED'),
    DEFAULT_STORAGE_TYPE: 'local',
    LOCAL_STORAGE_DEST: 'storage/uploads',
    PLUGIN_STORAGE_PATH: 'storage/plugins',
    MFSU_AD: 'none',
    WS_PATH: '/ws',
    SOCKET_PATH: 'storage/gateway.sock',
    PLUGIN_PACKAGE_PREFIX: '@tachybase/plugin-,@tachybase/module-',
    SERVER_TSCONFIG_PATH: './tsconfig.server.json',
    PLAYWRIGHT_AUTH_FILE: 'storage/playwright/.auth/admin.json',
    CACHE_DEFAULT_STORE: 'memory',
    CACHE_MEMORY_MAX: 2000,
    PLUGIN_STATICS_PATH: '/static/plugins/',
    LOGGER_BASE_PATH: 'storage/logs',
    APP_SERVER_BASE_URL: '',
    APP_PUBLIC_PATH: '/',
    TEGO_HOME: join(os.homedir(), '.tego'),
    TEGO_RUNTIME_NAME: 'current',
  };

  if (
    !process.env.APP_ENV_PATH &&
    process.argv[2] &&
    ['test', 'test:client', 'test:server'].includes(process.argv[2])
  ) {
    if (_existsSync(resolve(process.cwd(), '.env.test'))) {
      process.env.APP_ENV_PATH = '.env.test';
    }
  }

  if (!process.env.APP_ENV_PATH && process.argv[2] === 'e2e') {
    // 用于存放 playwright 自动生成的相关的文件
    generatePlaywrightPath();
    if (!_existsSync('.env.e2e') && _existsSync('.env.e2e.example')) {
      const env = readFileSync('.env.e2e.example');
      _writeFileSync('.env.e2e', env as any);
    }
    if (!_existsSync('.env.e2e')) {
      throw new Error('Please create .env.e2e file first!');
    }
    process.env.APP_ENV_PATH = '.env.e2e';
  }

  config({
    path: resolve(process.cwd(), process.env.APP_ENV_PATH || '.env'),
  });

  if (process.argv[2] === 'e2e' && !process.env.APP_BASE_URL) {
    process.env.APP_BASE_URL = `http://127.0.0.1:${process.env.APP_PORT}`;
  }

  if (
    !process.env.TEGO_RUNTIME_HOME &&
    !process.env.TEGO_RUNTIME_NAME &&
    _existsSync(resolve(process.cwd(), 'storage'))
  ) {
    process.env.TEGO_RUNTIME_HOME = process.cwd();
  }

  for (const key in env) {
    if (!process.env[key]) {
      // @ts-ignore
      process.env[key] = env[key];
    }
  }

  if (!process.env.TEGO_RUNTIME_HOME) {
    process.env.TEGO_RUNTIME_HOME = join(process.env.TEGO_HOME!, process.env.TEGO_RUNTIME_NAME!);
  }

  if (!process.env.__env_modified__ && process.env.APP_PUBLIC_PATH) {
    const publicPath = process.env.APP_PUBLIC_PATH.replace(/\/$/g, '');
    const keys = ['API_BASE_PATH', 'WS_PATH', 'PLUGIN_STATICS_PATH'];
    for (const key of keys) {
      process.env[key] = publicPath + process.env[key];
    }
    // @ts-ignore
    process.env.__env_modified__ = true;
  }

  if (!process.env.__env_modified__ && process.env.APP_SERVER_BASE_URL && !process.env.API_BASE_URL) {
    process.env.API_BASE_URL = process.env.APP_SERVER_BASE_URL + process.env.API_BASE_PATH;
    // @ts-ignore
    process.env.__env_modified__ = true;
  }
}

export const getHostInUrl = async (host: string): Promise<string> => {
  if (host === DEFAULT_DEV_HOST) {
    return 'localhost';
  }

  const { isIPv6 } = await import('node:net');
  if (isIPv6(host)) {
    return host === '::' ? '[::1]' : `[${host}]`;
  }
  return host;
};

export const castArray = <T>(arr?: T | T[]): T[] => {
  if (arr === undefined) {
    return [];
  }
  return Array.isArray(arr) ? arr : [arr];
};
