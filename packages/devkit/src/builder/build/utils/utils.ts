import { createRequire } from 'node:module';
import path from 'node:path';

import chalk from 'chalk';
import fg from 'fast-glob';
import fs from 'fs-extra';
import { Options as TsupConfig } from 'tsup';
import { require as tsxRequire } from 'tsx/cjs/api';
import { InlineConfig as ViteConfig } from 'vite';

import { NODE_MODULES } from '../constant';

const require = createRequire(import.meta.url);

export type PkgLog = (msg: string, ...args: any[]) => void;
export const getPkgLog = (pkgName: string) => {
  const pkgStr = chalk.underline.magentaBright(pkgName);
  const pkgLog: PkgLog = (msg: string, ...optionalParams: any[]) => console.log(`${pkgStr}: ${msg}`, ...optionalParams);
  return pkgLog;
};

export function toUnixPath(filepath: string) {
  return filepath.replace(/\\/g, '/');
}

export function getPackageJson(cwd: string) {
  return require(path.join(cwd, 'package.json'));
}

export interface UserConfig {
  modifyTsupConfig: (config: TsupConfig) => TsupConfig;
  modifyViteConfig: (config: ViteConfig) => ViteConfig;
  beforeBuild?: (log: PkgLog) => void | Promise<void>;
  afterBuild?: (log: PkgLog) => void | Promise<void>;
}

export function defineConfig(config: Partial<UserConfig>): UserConfig {
  return config as UserConfig;
}

export function getUserConfig(cwd: string) {
  const config = defineConfig({
    modifyTsupConfig: (config: TsupConfig) => config,
    modifyViteConfig: (config: ViteConfig) => config,
  });

  const buildConfigs = fg.sync(['./build.config.js', './build.config.ts'], { cwd });
  if (buildConfigs.length > 1) {
    throw new Error(`Multiple build configs found: ${buildConfigs.join(', ')}`);
  }
  if (buildConfigs.length === 1) {
    const userConfig = tsxRequire(buildConfigs[0], path.resolve(cwd, 'index.js'));
    Object.assign(config, userConfig.default || userConfig);
  }
  return config;
}

const CACHE_DIR = path.join(NODE_MODULES, '.cache', 'tachybase');
export function writeToCache(key: string, data: Record<string, any>) {
  const cachePath = path.join(CACHE_DIR, `${key}.json`);
  fs.ensureDirSync(path.dirname(cachePath));
  fs.writeJsonSync(cachePath, data, { spaces: 2 });
}

export function readFromCache(key: string) {
  const cachePath = path.join(CACHE_DIR, `${key}.json`);
  if (fs.existsSync(cachePath)) {
    return fs.readJsonSync(cachePath);
  }
  return {};
}
