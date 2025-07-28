import path from 'node:path';

export const DEFAULT_DEV_PLUGINS_PATH = path.resolve('plugins', 'dev');
export const DEFAULT_REMOTE_PLUGINS_PATH = path.resolve('plugins', 'remote');
export const DEFAULT_BUILTIN_PLUGINS_PATH = path.resolve('plugins', 'builtin');
export const DEFAULT_BUILTIN_PLUGINS_RELATIVE_PATH = path.join('plugins', 'builtin');
export const DEFAULT_WEB_PACKAGE_NAME = '@tego/web';
