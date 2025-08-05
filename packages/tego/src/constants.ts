import fs from 'node:fs';
import path from 'node:path';
import TachybaseGlobal from '@tachybase/globals';

import { parseEnvironment } from './utils';

// 解析环境变量
parseEnvironment();

// 读取配置
if (!fs.existsSync(`${process.env.TEGO_RUNTIME_HOME}/settings.js`)) {
  fs.copyFileSync(path.join(__dirname, '../presets/settings.js'), `${process.env.TEGO_RUNTIME_HOME}/settings.js`);
}
TachybaseGlobal.settings = require(`${process.env.TEGO_RUNTIME_HOME}/settings.js`);

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
