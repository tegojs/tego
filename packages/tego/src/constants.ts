import fs from 'node:fs';
import path from 'node:path';
import TachybaseGlobal from '@tachybase/globals';

import { convertEnvToSettings, parseEnvironment } from './utils';

// 解析环境变量
parseEnvironment();

// 读取配置
// 兼容旧的 .env 环境变量文件作为配置（仅在 settings.js 不存在时使用，且 .env 文件存在）
if (
  fs.existsSync(path.join(process.env.TEGO_RUNTIME_HOME, '.env')) &&
  !fs.existsSync(`${process.env.TEGO_RUNTIME_HOME}/settings.js`)
) {
  if (!fs.existsSync(`${process.env.TEGO_RUNTIME_HOME}/settings.js`)) {
    fs.mkdirSync(`${process.env.TEGO_RUNTIME_HOME}`, { recursive: true });
    fs.copyFileSync(path.join(__dirname, '../presets/settings.js'), `${process.env.TEGO_RUNTIME_HOME}/settings.js`);
  }
  TachybaseGlobal.settings = require(`${process.env.TEGO_RUNTIME_HOME}/settings.js`);
} else {
  TachybaseGlobal.settings = convertEnvToSettings(process.env);
}

for (const key in TachybaseGlobal.settings.env) {
  if (!process.env[key]) {
    process.env[key] = TachybaseGlobal.settings.env[key];
  }
}

export const DEFAULT_DEV_PLUGINS_PATH = path.join(process.env.TEGO_RUNTIME_HOME, 'plugins', 'dev');
export const DEFAULT_REMOTE_PLUGINS_PATH = path.join(process.env.TEGO_RUNTIME_HOME, 'plugins', 'remote');
export const DEFAULT_BUILTIN_PLUGINS_PATH = path.join(process.env.TEGO_RUNTIME_HOME, 'plugins', 'builtin');
export const DEFAULT_WEB_PACKAGE_NAME = '@tego/web';
export const INDEX_TEGO_URL = 'https://tachybase.org/index.tego.json';
export const LAST_UPDATE_FILE_SUFFIX = '.last-update-at';
