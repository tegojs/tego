export const APP_NAME = 'tachybase';
export const DEFAULT_PLUGIN_STORAGE_PATH = 'storage/plugins';
export const DEFAULT_PLUGIN_PATH = 'packages/';
export const pluginPrefix = (process.env.PLUGIN_PACKAGE_PREFIX || '@tachybase/plugin-,@tachybase/module-').split(',');
export const requireRegex = /require\s*\(['"`](.*?)['"`]\)/g;
export const importRegex = /^import(?:['"\s]*([\w*${}\s,]+)from\s*)?['"\s]['"\s](.*[@\w_-]+)['"\s].*/gm;
export const EXTERNAL = [
  // tachybase
  '@tachybase/acl',
  '@tachybase/actions',
  '@tachybase/auth',
  '@tachybase/cache',
  '@tachybase/client',
  '@tachybase/database',
  '@tachybase/evaluators',
  '@tachybase/logger',
  '@tachybase/resourcer',
  '@tachybase/sdk',
  '@tego/core',
  '@tachybase/test',
  '@tachybase/utils',
  '@tachybase/globals',
  '@tachybase/loader',
  '@tego/client',
  '@tego/server',

  // @tachybase/auth
  'jsonwebtoken',

  // @tachybase/cache
  'cache-manager',

  // @tachybase/database
  'sequelize',
  'umzug',
  'async-mutex',

  // @tachybase/evaluators
  '@formulajs/formulajs',

  // @tachybase/logger
  'winston',
  'winston-daily-rotate-file',

  // koa
  'koa',
  '@koa/cors',
  'multer',
  '@koa/multer',
  'koa-bodyparser',

  // react
  'react',
  'react-dom',
  'react/jsx-runtime',

  // react-router
  'react-router',
  'react-router-dom',

  // antd
  'antd',
  'antd-style',
  '@ant-design/icons',
  '@ant-design/cssinjs',

  // i18next
  'i18next',
  'react-i18next',

  // dnd-kit 相关
  '@dnd-kit/accessibility',
  '@dnd-kit/core',
  '@dnd-kit/modifiers',
  '@dnd-kit/sortable',
  '@dnd-kit/utilities',

  // 内置类库 相关
  '@tachybase/components',
  '@tachybase/requirejs',
  '@tachybase/schema',

  // utils
  'dayjs',
  'mysql2',
  'pg',
  'pg-hstore',
  'sqlite3',
  'supertest',
  'axios',
  '@emotion/css',
  'ahooks',
  'lodash',
  'china-division',
];
