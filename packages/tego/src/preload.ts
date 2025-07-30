import { Module } from 'node:module';
import TachybaseGlobal from '@tachybase/globals';
import { defineLoader } from '@tachybase/loader';

import { DEFAULT_BUILTIN_PLUGINS_PATH, DEFAULT_DEV_PLUGINS_PATH, DEFAULT_REMOTE_PLUGINS_PATH } from './constants';

// 默认 NODE_MODULES_PATH 搜索路径
if (!process.env.NODE_MODULES_PATH) {
  process.env.NODE_MODULES_PATH = [
    // 开发插件
    DEFAULT_DEV_PLUGINS_PATH,
    // 远程插件
    DEFAULT_REMOTE_PLUGINS_PATH,
    // 内置插件
    DEFAULT_BUILTIN_PLUGINS_PATH,
  ].join(',');
}

// 解析 process.env.NODE_MODULES_PATH
const paths = process.env.NODE_MODULES_PATH.split(',');
TachybaseGlobal.getInstance().set('PLUGIN_PATHS', paths);

declare module 'node:module' {
  // 扩展 NodeJS.Module 静态属性
  export function _load(request: string, parent: NodeModule | null, isMain: boolean): any;
}

const originalLoad = Module._load;
const appRoot = __dirname;

// 使用加载白名单的机制
// TODO 考虑服务端校验的版本也和这个保持同步（服务端要求的版本要和这里以及引擎的 package.json 一致）
const defaultWhitelists = [
  '@koa/cors',
  '@koa/multer',
  'async-mutex',
  'axios',
  'cache-manager',
  'dayjs',
  'dotenv',
  'i18next',
  'jsonwebtoken',
  'koa',
  'koa-bodyparser',
  'lodash',
  'multer',
  'mysql2',
  'pg',
  'react',
  'sequelize',
  'sqlite3',
  'umzug',
  'winston',
  'winston-daily-rotate-file',
];

const whitelists = new Set(defaultWhitelists);

// 允许环境变量设置模块
// 额外添加的模块会被放在指定目录 NODE_MODULES_PATH 中
if (process.env.ENGINE_MODULES) {
  process.env.ENGINE_MODULES.split(',').forEach((item: string) => {
    whitelists.add(item);
  });
}

// 加载路径包含两个，一个是引擎的启动目录，另一个是指定的插件目录
const lookingPaths = [appRoot, ...TachybaseGlobal.getInstance().get('PLUGIN_PATHS')];

// 带给子进程加载路径
TachybaseGlobal.getInstance().set('WORKER_PATHS', lookingPaths);
TachybaseGlobal.getInstance().set('WORKER_MODULES', [...whitelists]);

// 整个加载过程允许报错，保持和默认加载器一样的行为
Module._load = defineLoader(whitelists, originalLoad, lookingPaths);
