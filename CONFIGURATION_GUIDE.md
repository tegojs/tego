# Tego 配置指南

本文档说明新版本（1.3.54+）的配置方式。

## 配置方式概览

新版本支持**两种配置方式**，可以同时使用：

1. **`.env` 文件** - 扁平化的环境变量配置（传统方式）
2. **`settings.js` 文件** - 结构化的配置文件（新方式，推荐）

## 配置加载顺序

配置的加载顺序如下：

1. **`.env` 文件**（如果存在）- 通过 `dotenv` 加载到 `process.env`
2. **`settings.js` 文件** - 从 `TEGO_RUNTIME_HOME/settings.js` 加载
3. **优先级**：`.env` 中的值 > `settings.js` 中的值

> **注意**：如果 `process.env` 中已有某个变量，`settings.js` 中的对应值**不会**覆盖它。`settings.js` 只作为默认值使用。

## 1. `.env` 文件配置

### 位置

- 项目根目录下的 `.env` 文件
- 可以通过 `APP_ENV_PATH` 环境变量指定其他路径（如 `.env.test`, `.env.e2e`）

### 格式

```env
# 应用配置
APP_ENV=development
APP_PORT=3000
APP_KEY=your-secret-key

# 数据库配置
DB_DIALECT=sqlite
DB_STORAGE=storage/db/tego.sqlite
# 或 PostgreSQL
# DB_DIALECT=postgres
# DB_HOST=localhost
# DB_PORT=5432
# DB_DATABASE=tego
# DB_USER=tego
# DB_PASSWORD=password

# 日志配置
LOGGER_TRANSPORT=console,dailyRotateFile
LOGGER_LEVEL=info
LOGGER_MAX_FILES=14d
LOGGER_MAX_SIZE=10m

# 缓存配置
CACHE_DEFAULT_STORE=memory
CACHE_MEMORY_MAX=2000
# 或 Redis
# CACHE_DEFAULT_STORE=redis
# CACHE_REDIS_URL=redis://localhost:6379

# API 配置
API_BASE_PATH=/api/
APP_SERVER_BASE_URL=http://localhost:3000
APP_PUBLIC_PATH=/

# 运行时配置
TEGO_RUNTIME_HOME=.
TEGO_RUNTIME_NAME=current
```

### 环境变量命名规则

- **通用环境变量**：直接使用，如 `APP_ENV`, `APP_PORT`
- **日志配置**：以 `LOGGER_` 开头，如 `LOGGER_TRANSPORT`, `LOGGER_LEVEL`
- **数据库配置**：以 `DB_` 开头，如 `DB_DIALECT`, `DB_HOST`, `DB_STORAGE`
- **缓存配置**：以 `CACHE_` 开头，如 `CACHE_DEFAULT_STORE`, `CACHE_REDIS_URL`

## 2. `settings.js` 文件配置

### 位置

- `{TEGO_RUNTIME_HOME}/settings.js`
- 首次运行时，如果文件不存在，会自动从预设模板复制

### 格式

```javascript
/** @type {import('@tachybase/globals').Settings} */
module.exports = {
  /**
   * 如果对应的环境变量没设置，则使用这里面的值
   * 如果环境变量已设置，则使用环境变量的值
   */
  env: {
    APP_ENV: 'development',
    APP_PORT: 3000,
    APP_KEY: 'test-key',
    API_BASE_PATH: '/api/',
    INIT_APP_LANG: 'en-US',
    INIT_ROOT_EMAIL: 'admin@example.com',
    INIT_ROOT_USERNAME: 'admin',
    INIT_ROOT_PASSWORD: 'admin',
    INIT_ROOT_NICKNAME: 'Admin',
    PLUGIN_STORAGE_PATH: 'storage/plugins',
    WS_PATH: '/ws',
    SOCKET_PATH: 'storage/gateway.sock',
    PLUGIN_PACKAGE_PREFIX: '@tachybase/plugin-,@tachybase/module-',
    SERVER_TSCONFIG_PATH: './tsconfig.server.json',
    PLAYWRIGHT_AUTH_FILE: 'storage/playwright/.auth/admin.json',
    PLUGIN_STATICS_PATH: '/static/plugins/',
    APP_SERVER_BASE_URL: '',
    APP_PUBLIC_PATH: '/',
  },

  logger: {
    /**
     * console | file | dailyRotateFile
     */
    transport: ['console', 'dailyRotateFile'],
    basePath: 'storage/logs',
    /**
     * error | warn | info | debug
     */
    // level: 'warn',
    /**
     * If LOGGER_TRANSPORT is dailyRotateFile and using days, add 'd' as the suffix.
     */
    // maxFiles: '14d',
    /**
     * add 'k', 'm', 'g' as the suffix.
     */
    // maxSize: '10m',
    /**
     * json | logfmt | delimiter | console
     */
    // format: 'json',
  },

  database: {
    /**
     * sqlite | postgres | mysql | mariadb
     */
    dialect: 'sqlite',
    storage: 'storage/db/tego.sqlite',
    // 或 PostgreSQL/MySQL
    // host: 'localhost',
    // port: 5432,
    // database: 'tego',
    // user: 'tego',
    // password: 'password',
    // tablePrefix: '',
    underscored: false,
    timezone: '+00:00',
    // logging: true,
    ssl: {
      // ca: '',
      // key: '',
      // cert: '',
      // rejectUnauthorized: true,
    },
  },

  cache: {
    defaultStore: 'memory',
    memoryMax: 2000,
    // 或 Redis
    // defaultStore: 'redis',
    // redisUrl: 'redis://localhost:6379',
  },

  encryptionField: {
    // key: '',
  },

  presets: {
    /**
     * 默认启用，并且不可删除
     */
    builtinPlugins: [
      'acl',
      'app-info',
      'auth',
      // ... 其他内置插件
    ],
    /**
     * 可删除插件
     */
    externalPlugins: [
      { name: 'action-bulk-edit', enabledByDefault: true },
      { name: 'action-export', enabledByDefault: true },
      // ... 其他外部插件
    ],
    runtimePlugins: [],
  },

  worker: {
    /**
     * -1: 不限制，自动设置为核心数量
     * 0: 禁用 worker
     * >0: 指定 worker 数量
     */
    count: -1,
    /**
     * -1: 最大为核心数量
     * >0: 最大 worker 数量
     */
    countMax: -1,
  },

  export: {
    // lengthMax: 2000,
    // workerPageSize: 1000,
  },

  misc: {
    forbidSubAppPlugins: ['multi-app', 'manual-notification'],
  },
};
```

## 配置方式对比

| 特性 | `.env` 文件 | `settings.js` 文件 |
|------|-----------|-------------------|
| **格式** | 扁平化键值对 | 结构化对象 |
| **类型支持** | 字符串（需手动转换） | 支持多种类型（数字、数组、对象） |
| **可读性** | 简单直接 | 更清晰的结构 |
| **适用场景** | 简单配置、环境变量 | 复杂配置、插件管理 |
| **优先级** | 高（会覆盖 settings.js） | 低（作为默认值） |

## 推荐配置方式

### 开发环境

**推荐使用 `.env` 文件**，因为：
- 简单直接，易于修改
- 可以轻松切换不同环境（`.env.development`, `.env.test`）
- 适合版本控制（可以提交 `.env.example`，不提交 `.env`）

```env
# .env
APP_ENV=development
APP_PORT=3000
DB_DIALECT=sqlite
DB_STORAGE=storage/db/tego.sqlite
```

### 生产环境

**推荐使用 `settings.js` 文件**，因为：
- 结构化配置更清晰
- 可以配置插件列表
- 可以设置复杂的配置对象（如 SSL、Worker 配置）

```javascript
// {TEGO_RUNTIME_HOME}/settings.js
module.exports = {
  env: {
    APP_ENV: 'production',
    APP_PORT: 3000,
  },
  database: {
    dialect: 'postgres',
    host: 'db.example.com',
    port: 5432,
    database: 'tego',
    user: 'tego',
    password: process.env.DB_PASSWORD, // 敏感信息从环境变量读取
  },
  // ... 其他配置
};
```

### 混合使用（推荐）

**最佳实践**：同时使用两种方式
- **`.env`** - 存储敏感信息（密码、密钥）和简单配置
- **`settings.js`** - 存储结构化配置和插件配置

```env
# .env - 敏感信息和简单配置
APP_KEY=your-secret-key
DB_PASSWORD=secure-password
CACHE_REDIS_URL=redis://localhost:6379
```

```javascript
// settings.js - 结构化配置
module.exports = {
  database: {
    dialect: 'postgres',
    host: 'localhost',
    // password 从 process.env.DB_PASSWORD 读取
  },
  cache: {
    defaultStore: 'redis',
    // redisUrl 从 process.env.CACHE_REDIS_URL 读取
  },
  // ... 其他配置
};
```

## 配置示例

### SQLite 配置

```env
# .env
DB_DIALECT=sqlite
DB_STORAGE=storage/db/tego.sqlite
```

### PostgreSQL 配置

```env
# .env
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=tego
DB_USER=tego
DB_PASSWORD=password
DB_TIMEZONE=+00:00
```

### MySQL 配置

```env
# .env
DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=tego
DB_USER=tego
DB_PASSWORD=password
DB_TIMEZONE=+00:00
```

### Redis 缓存配置

```env
# .env
CACHE_DEFAULT_STORE=redis
CACHE_REDIS_URL=redis://localhost:6379
```

### 日志配置

```env
# .env
LOGGER_TRANSPORT=console,dailyRotateFile
LOGGER_LEVEL=info
LOGGER_MAX_FILES=14d
LOGGER_MAX_SIZE=10m
LOGGER_FORMAT=json
```

## 常见问题

### Q: `.env` 和 `settings.js` 哪个优先级更高？

A: `.env` 文件优先级更高。如果 `process.env` 中已有某个变量，`settings.js` 中的对应值不会覆盖它。

### Q: 如何切换不同环境的配置？

A: 可以使用 `APP_ENV_PATH` 环境变量指定不同的 `.env` 文件：
```bash
# 使用 .env.test
APP_ENV_PATH=.env.test tego start

# 使用 .env.production
APP_ENV_PATH=.env.production tego start
```

### Q: `settings.js` 文件在哪里？

A: 位于 `{TEGO_RUNTIME_HOME}/settings.js`。如果文件不存在，首次运行时会自动从预设模板复制。

### Q: 如何查看当前使用的配置？

A: 可以通过 `ctx.tego.environment.getVariables()` 查看环境变量，或通过 `TachybaseGlobal.settings` 查看 Settings 对象。

### Q: 敏感信息应该放在哪里？

A: 推荐放在 `.env` 文件中，并确保 `.env` 文件不被提交到版本控制系统（添加到 `.gitignore`）。

