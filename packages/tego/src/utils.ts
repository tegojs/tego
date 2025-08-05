import { createHash } from 'node:crypto';
import fs, {
  cpSync as _cpSync,
  existsSync as _existsSync,
  writeFileSync as _writeFileSync,
  createWriteStream,
} from 'node:fs';
import { access, mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import TachybaseGlobal from '@tachybase/globals';

import { config } from 'dotenv';
import npmRegistryFetch from 'npm-registry-fetch';
import * as tar from 'tar';

import { DEFAULT_WEB_PACKAGE_NAME, LAST_UPDATE_FILE_SUFFIX } from './constants';

export function parseEnvironment() {
  const env = {
    TEGO_HOME: join(os.homedir(), '.tego'),
    TEGO_RUNTIME_NAME: 'current',
  };

  // 允许 .env 不存在
  if (_existsSync(resolve(process.cwd(), '.env'))) {
    config({
      path: resolve(process.cwd(), '.env'),
    });
  }

  // 如果存在 storage 的话，TEGO_RUNTIME_HOME 默认指向当前路径
  if (
    !process.env.TEGO_RUNTIME_HOME &&
    !process.env.TEGO_RUNTIME_NAME &&
    fs.existsSync(resolve(process.cwd(), 'storage'))
  ) {
    process.env.TEGO_RUNTIME_HOME = process.cwd();
  }

  for (const key in env) {
    if (!process.env[key]) {
      process.env[key] = env[key];
    }
  }

  // 如果 TEGO_RUNTIME_HOME 还未设置，那就设置为 TEGO_HOME/TEGO_RUNTIME_NAME
  if (!process.env.TEGO_RUNTIME_HOME) {
    process.env.TEGO_RUNTIME_HOME = join(process.env.TEGO_HOME!, process.env.TEGO_RUNTIME_NAME!);
  }

  if (!process.env.__env_modified__ && process.env.APP_PUBLIC_PATH) {
    const publicPath = process.env.APP_PUBLIC_PATH.replace(/\/$/g, '');
    const keys = ['API_BASE_PATH', 'WS_PATH', 'PLUGIN_STATICS_PATH'];
    for (const key of keys) {
      process.env[key] = publicPath + process.env[key];
    }
    process.env.__env_modified__ = '1';
  }

  if (!process.env.__env_modified__ && process.env.APP_SERVER_BASE_URL && !process.env.API_BASE_URL) {
    process.env.API_BASE_URL = process.env.APP_SERVER_BASE_URL + process.env.API_BASE_PATH;
    process.env.__env_modified__ = '1';
  }
}

export function guessServePath() {
  const distPath = resolve('apps/web/dist/index.html');
  const clientPath = resolve('client/index.html');

  if (fs.existsSync(distPath)) {
    return resolve('apps/web/dist');
  } else if (fs.existsSync(clientPath)) {
    return resolve('client');
  }

  const pluginPaths = TachybaseGlobal.getInstance().get<string[]>('PLUGIN_PATHS');
  for (const basePath of pluginPaths) {
    if (fs.existsSync(resolve(basePath, DEFAULT_WEB_PACKAGE_NAME, 'dist/index.html'))) {
      return resolve(basePath, DEFAULT_WEB_PACKAGE_NAME, 'dist');
    }
  }

  return false;
}

async function getTarballMeta(pkgName, version = 'latest') {
  const info = await npmRegistryFetch.json(`/${pkgName}/${version}`, {
    query: { fullMetadata: true },
    registry: process.env.NPM_CONFIG_REGISTRY ?? 'https://registry.npmjs.org',
  });
  return { url: info.dist.tarball, shasum: info.dist.shasum };
}

function sha1(buffer: Buffer | string) {
  return createHash('sha1').update(buffer).digest('hex');
}

async function getFileSha1(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return sha1(buffer);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// 下载并缓存 tgz 到 ~/.tego/plugins
export async function downloadTar(packageName: string, target: string) {
  const { url, shasum } = await getTarballMeta(packageName);

  const baseName = `${packageName.replace('/', '__')}@${shasum}`;
  const cachedTar = join(process.env.TEGO_HOME!, 'plugins', `${baseName}.tar.gz`);
  const cachedSha = join(process.env.TEGO_HOME!, 'plugins', `${baseName}.sha1`);

  const exists = await fileExists(cachedTar);
  const shaMatches = exists ? (await getFileSha1(cachedTar)) === shasum : false;

  if (!exists || !shaMatches) {
    await mkdir(dirname(cachedTar), { recursive: true });

    const res = await fetch(url);
    if (!res.ok || !res.body) {
      throw new Error(`Failed to fetch tarball: ${res.statusText}`);
    }

    const writer = createWriteStream(cachedTar);
    await pipeline(res.body as any, writer);

    const actualSha = await getFileSha1(cachedTar);
    if (actualSha !== shasum) {
      await unlink(cachedTar);
      throw new Error(`Downloaded tarball hash mismatch for ${packageName}`);
    }

    await writeFile(cachedSha, shasum, 'utf-8');
  }

  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });

  await tar.x({
    file: cachedTar,
    gzip: true,
    cwd: target,
    strip: 1,
    k: true,
  });
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export class TegoIndexManager {
  private indexUrl: string;
  private indexFile: string;
  private lastUpdateFile: string;

  constructor({
    indexUrl,
    baseDir,
    lastUpdateSuffix = LAST_UPDATE_FILE_SUFFIX,
  }: {
    indexUrl: string;
    baseDir: string;
    lastUpdateSuffix?: string;
  }) {
    this.indexUrl = indexUrl;
    this.indexFile = join(baseDir, 'index.tego.json');
    this.lastUpdateFile = join(baseDir, 'index.tego.json' + lastUpdateSuffix);
  }

  private async readLastUpdateTime(): Promise<Date | null> {
    try {
      const content = await readFile(this.lastUpdateFile, 'utf-8');
      return new Date(content.trim());
    } catch {
      return null;
    }
  }

  private async fetchIndexFile(): Promise<any> {
    const res = await fetch(this.indexUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${this.indexUrl}: ${res.statusText}`);
    }

    const json = await res.json();
    await writeFile(this.indexFile, JSON.stringify(json, null, 2), 'utf-8');
    await writeFile(this.lastUpdateFile, new Date().toISOString(), 'utf-8');
    return json;
  }

  async getIndex(): Promise<any> {
    const lastUpdated = await this.readLastUpdateTime();
    if (lastUpdated && Date.now() - lastUpdated.getTime() < ONE_DAY_MS) {
      console.info(`🕒 index.tego.json was updated within 1 day, skipping download.`);
      const content = await readFile(this.indexFile, 'utf-8');
      return JSON.parse(content);
    }

    return await this.fetchIndexFile();
  }
}
