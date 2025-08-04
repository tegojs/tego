import path from 'node:path';

import { parseEnvironment } from './utils';

// 解析环境变量
parseEnvironment();

export const DEFAULT_DEV_PLUGINS_PATH = path.join(process.env.TEGO_RUNTIME_HOME, 'plugins', 'dev');
export const DEFAULT_REMOTE_PLUGINS_PATH = path.join(process.env.TEGO_RUNTIME_HOME, 'plugins', 'remote');
export const DEFAULT_BUILTIN_PLUGINS_PATH = path.join(process.env.TEGO_RUNTIME_HOME, 'plugins', 'builtin');
export const DEFAULT_WEB_PACKAGE_NAME = '@tego/web';
export const INDEX_TEGO_URL = 'https://tachybase.org/index.tego.json';
export const LAST_UPDATE_FILE_SUFFIX = '.last-update-at';
