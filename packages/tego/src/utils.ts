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
import TachybaseGlobal, { Settings } from '@tachybase/globals';

import { config } from 'dotenv';
import { cloneDeep } from 'lodash';
import npmRegistryFetch from 'npm-registry-fetch';
import * as tar from 'tar';

import defaultSettings from '../presets/settings';
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

export function convertEnvToSettings(flatEnv: Record<string, string | undefined>) {
  const settings: Settings = cloneDeep(defaultSettings);

  for (const [key, value] of Object.entries(flatEnv)) {
    if (!value) continue;

    switch (key) {
      /** ================= LOGGER ================= */
      case 'LOGGER_TRANSPORT':
        settings.logger.transport = value.split(',') as any;
        break;
      case 'LOGGER_BASE_PATH':
        settings.logger.basePath = value;
        break;
      case 'LOGGER_LEVEL':
        settings.logger.level = value as any;
        break;
      case 'LOGGER_MAX_FILES':
        settings.logger.maxFiles = value;
        break;
      case 'LOGGER_MAX_SIZE':
        settings.logger.maxSize = value;
        break;
      case 'LOGGER_FORMAT':
        settings.logger.format = value as any;
        break;

      /** ================= DATABASE ================= */
      case 'DB_DIALECT':
        settings.database.dialect = value as any;
        break;
      case 'DB_STORAGE':
        settings.database.storage = value;
        break;
      case 'DB_HOST':
        settings.database.host = value;
        break;
      case 'DB_PORT':
        settings.database.port = +value;
        break;
      case 'DB_DATABASE':
        settings.database.database = value;
        break;
      case 'DB_USER':
        settings.database.user = value;
        break;
      case 'DB_PASSWORD':
        settings.database.password = value;
        break;
      case 'DB_LOGGING':
        settings.database.logging = value === 'on';
        break;
      case 'DB_TABLE_PREFIX':
        settings.database.tablePrefix = value;
        break;
      case 'DB_UNDERSCORED':
        settings.database.underscored = value === 'true';
        break;

      case 'DB_DIALECT_OPTIONS_SSL_CA':
        settings.database.ssl = settings.database.ssl || {};
        settings.database.ssl.ca = value;
        break;
      case 'DB_DIALECT_OPTIONS_SSL_KEY':
        settings.database.ssl = settings.database.ssl || {};
        settings.database.ssl.key = value;
        break;
      case 'DB_DIALECT_OPTIONS_SSL_CERT':
        settings.database.ssl = settings.database.ssl || {};
        settings.database.ssl.cert = value;
        break;
      case 'DB_DIALECT_OPTIONS_SSL_REJECT_UNAUTHORIZED':
        settings.database.ssl = settings.database.ssl || {};
        settings.database.ssl.rejectUnauthorized = value === 'true';
        break;

      /** ================= CACHE ================= */
      case 'CACHE_DEFAULT_STORE':
        settings.cache.defaultStore = value as any;
        break;
      case 'CACHE_MEMORY_MAX':
        settings.cache.memoryMax = +value;
        break;
      case 'CACHE_REDIS_URL':
        settings.cache.redisUrl = value;
        break;

      /** ================= ENCRYPTION ================= */
      case 'ENCRYPTION_FIELD_KEY':
        settings.encryptionField.key = value;
        break;

      /** ================= PRESETS ================= */
      case 'PRESETS_BULTIN_PLUGINS':
        settings.presets.builtinPlugins = value.split(',');
        break;
      case 'PRESETS_EXTERNAL_PLUGINS':
        settings.presets.externalPlugins = value.split(',').map((name) => {
          if (name.startsWith('!')) {
            return { name: name.slice(1), enabledByDefault: false };
          }
          if (name.startsWith('|')) {
            return { name: name.slice(1), enabledByDefault: false };
          }
          return { name, enabledByDefault: true };
        });
        break;

      /** ================= WORKER ================= */
      case 'WORKER_COUNT':
        settings.worker.count = +value;
        break;
      case 'WORKER_COUNT_MAX':
        settings.worker.countMax = +value;
        break;

      /** ================= EXPORT ================= */
      case 'EXPORT_LENGTH_MAX':
        settings.export.lengthMax = +value;
        break;
      case 'EXPORT_WORKER_PAGESIZE':
        settings.export.workerPageSize = +value;
        break;

      /** ================= MISC ================= */
      case 'FORBID_SUB_APP_PLUGINS':
        settings.misc.forbidSubAppPlugins = value.split(',');
        break;

      default:
        // 不处理未知 key
        break;
    }
  }

  return settings;
}
