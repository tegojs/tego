export interface Settings {
  env: {
    APP_ENV: string;
    APP_PORT: number;
    APP_KEY: string;
    INIT_APP_LANG: string;
    INIT_ROOT_EMAIL: string;
    INIT_ROOT_USERNAME: string;
    INIT_ROOT_PASSWORD: string;
    INIT_ROOT_NICKNAME: string;
    FORCE_LOCALE_CACHE?: string;
  };
  logger: {
    /** console | file | dailyRotateFile */
    transport?: ('console' | 'file' | 'dailyRotateFile')[];
    basePath: string;
    level?: 'error' | 'warn' | 'info' | 'debug';
    maxFiles?: string | number; // e.g. "14d"
    maxSize?: string | number; // e.g. "10m"
    format?: 'logfmt' | 'json' | 'delimiter' | 'console';
  };
  database: {
    dialect: 'sqlite' | 'postgres' | 'mysql' | 'mariadb';
    storage?: string;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    logging?: boolean;
    tablePrefix?: string;
    underscored?: boolean;
    schema?: string;
    timezone?: string;
    ssl?: {
      mode?: string;
      ca?: string;
      key?: string;
      cert?: string;
      rejectUnauthorized?: boolean;
    };
  };
  cache: {
    defaultStore: 'memory' | 'redis';
    memoryMax: number;
    redisUrl?: string;
  };
  encryptionField: {
    key?: string;
  };
  presets: {
    /** 默认启用且不可删除 */
    builtinPlugins: string[];
    /** 可删除插件，enabledByDefault 指定默认是否启用 */
    externalPlugins: {
      name: string;
      enabledByDefault: boolean;
    }[];
    runtimePlugins: string[];
  };
  worker: {
    /**
     * -1: 不限制，自动设置为核心数量
     * 0: 禁用 worker
     * >0: 指定 worker 数量
     */
    count: number;
    /**
     * 最大 worker 数量
     * -1 表示最大为核心数量
     */
    countMax: number;
    // errorRetry?: number;
    // maxMemory?: number; // 单位 MB
  };
  export: {
    lengthMax?: number;
    workerPageSize?: number;
  };
  misc: {
    forbidSubAppPlugins: string[];
  };
}

/**
 * 主配置对象的导出类型
 */
declare const config: Settings;
export default config;
