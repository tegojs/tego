# Tego 核心破坏性更改文档 (1.3.52 → 1.3.54+)

本文档详细说明了从版本 1.3.52 到 1.3.54+ 的所有破坏性更改，以及相应的适配方法。

> **注意**：这些破坏性更改主要发生在以下提交中：
> - `54c107ae5` - refactor(core): replace Koa inheritance with EventEmitter (#829)
> - `38a7c962c` - feat: replace environment variables with js object settings (#788)

## 目录

1. [上下文对象变更](#1-上下文对象变更-ctxapp--ctxtego)
2. [命令行工具变更](#2-命令行工具变更-tachybase--tego)
3. [Application 方法废弃](#3-application-方法废弃)
4. [包名变更](#4-包名变更)
5. [环境变量配置变更](#5-环境变量配置变更)
6. [Application 架构变更](#6-application-架构变更)
7. [服务迁移](#7-服务迁移)
8. [其他废弃 API](#8-其他废弃-api)

---

## 1. 上下文对象变更: `ctx.app` → `ctx.tego`

### 变更说明

在 Koa 上下文中，应用实例从 `ctx.app` 改为 `ctx.tego`。这是最关键的破坏性更改，影响所有插件和中间件。

### 影响范围

- 所有使用 `ctx.app` 的中间件
- 所有使用 `ctx.app` 的 Action 处理器
- 所有使用 `ctx.app` 的 Hook 处理器

### 适配方法

**旧代码：**
```typescript
async (ctx, next) => {
  const app = ctx.app as Application;
  const name = ctx.app.name;
  const db = ctx.app.db;
  await ctx.app.authManager.get('basic', ctx);
  await next();
}
```

**新代码：**
```typescript
async (ctx, next) => {
  const app = ctx.tego as Application;
  const name = ctx.tego.name;
  const db = ctx.tego.db;
  await ctx.tego.authManager.get('basic', ctx);
  await next();
}
```

### 批量替换建议

在 `tego-standard` 仓库中，需要全局替换：
- `ctx.app` → `ctx.tego`
- 注意：某些情况下可能需要类型断言 `ctx.tego as Application`

---

## 2. 命令行工具变更: `tachybase` → `tego`

### 变更说明

命令行工具从 `tachybase` 重命名为 `tego`。所有 CLI 命令都需要从 `tachybase` 改为 `tego`。

### 影响范围

- 所有 `package.json` 中的脚本命令
- 所有文档中的命令示例
- 所有 CI/CD 脚本
- 代码中硬编码的命令调用

### 适配方法

**旧命令：**
```bash
tachybase build
tachybase dev
tachybase start
tachybase install
tachybase upgrade
tachybase pm
tachybase test
tachybase e2e
```

**新命令：**
```bash
tego build
tego dev
tego start
tego install
tego upgrade
tego pm
tego test
tego e2e
```

### package.json 脚本更新

**旧代码：**
```json
{
  "scripts": {
    "build": "tachybase build",
    "dev": "tachybase dev",
    "start": "tachybase start",
    "install": "tachybase install",
    "upgrade": "tachybase upgrade",
    "pm": "tachybase pm",
    "test": "tachybase test",
    "e2e": "tachybase e2e"
  }
}
```

**新代码：**
```json
{
  "scripts": {
    "build": "tego build",
    "dev": "tego dev",
    "start": "tego start",
    "install": "tego install",
    "upgrade": "tego upgrade",
    "pm": "tego pm",
    "test": "tego test",
    "e2e": "tego e2e"
  }
}
```

### 代码中的命令调用

**注意**：虽然命令行工具已改为 `tego`，但代码中可能仍有一些地方使用 `tachybase`。这些需要逐步更新：

**需要更新的地方：**
- `packages/core/src/commands/start.ts` - 错误消息中的命令提示
- `packages/core/src/plugin-manager/plugin-manager.ts` - `pnpm tachybase postinstall` 和 `pnpm tachybase refresh`
- `packages/core/src/application.ts` - 错误消息中的命令提示

**临时兼容性：**
- 代码中的 CLI 命令名可能仍为 `'tachybase'`（在 `createCLI()` 中），但实际执行的命令应该是 `tego`
- `app-command.ts` 中仍然兼容 `tachybase` 参数，但建议使用 `tego`

### 批量替换

在 `package.json` 和脚本文件中：
- `tachybase` → `tego`（在命令中）
- `pnpm tachybase` → `pnpm tego`
- `npx tachybase` → `npx tego`

**PowerShell 脚本：**
```powershell
# 更新 package.json 中的脚本
$packageJson = Get-Content package.json -Raw | ConvertFrom-Json
foreach ($script in $packageJson.scripts.PSObject.Properties) {
    $script.Value = $script.Value -replace 'tachybase', 'tego'
}
$packageJson | ConvertTo-Json -Depth 10 | Set-Content package.json
```

**Bash 脚本：**
```bash
# 更新 package.json 中的脚本
sed -i 's/tachybase/tego/g' package.json
```

---

## 3. Application 方法废弃

### 2.1 `app.collection()` → `app.db.collection()`

**废弃方法：**
```typescript
app.collection({ name: 'users' })
```

**新方法：**
```typescript
app.db.collection({ name: 'users' })
```

### 2.2 `app.resource()` → `app.resourcer.define()`

**废弃方法：**
```typescript
app.resource({ name: 'users', actions: { ... } })
```

**新方法：**
```typescript
app.resourcer.define({ name: 'users', actions: { ... } })
```

### 2.3 `app.actions()` → `app.resourcer.registerActions()`

**废弃方法：**
```typescript
app.actions(handlers, { resourceName: 'users' })
```

**新方法：**
```typescript
app.resourcer.registerActions(handlers)
```

### 2.4 `app.getPlugin()` → `app.pm.get()`

**废弃方法：**
```typescript
const plugin = app.getPlugin('workflow') as PluginWorkflow;
const plugin = app.getPlugin(PluginWorkflow);
```

**新方法：**
```typescript
const plugin = app.pm.get('workflow') as PluginWorkflow;
const plugin = app.pm.get(PluginWorkflow);
```

### 2.5 `app.parse()` → `app.runAsCLI()`

**废弃方法：**
```typescript
await app.parse(['restart']);
```

**新方法：**
```typescript
await app.runAsCLI(['restart'], { from: 'user' });
```

### 2.6 `app.locales` → `app.localeManager`

**废弃属性：**
```typescript
const locales = app.locales;
```

**新属性：**
```typescript
const localeManager = app.localeManager;
```

---

## 4. 包名变更

> **注意**：此变更在 1.3.52 之前已完成。如果 tego-standard 仍在使用 `@tachybase/server`，需要先完成此迁移。

### 变更说明

核心包从 `@tachybase/server` 重命名为 `@tego/core`。

### 适配方法

**旧代码：**
```typescript
import { Application } from '@tachybase/server';
```

**新代码：**
```typescript
import { Application } from '@tego/core';
```

### 批量替换

在 `package.json` 和所有导入语句中：
- `@tachybase/server` → `@tego/core`

---

## 5. 环境变量配置变更

### 变更说明

从直接使用 `process.env` 改为通过 `app.environment` 对象访问环境变量。环境变量现在通过 Settings 对象统一管理。

### 适配方法

**旧代码：**
```typescript
const apiBasePath = process.env.API_BASE_PATH;
const dbDialect = process.env.DB_DIALECT;
```

**新代码：**
```typescript
// 通过 environment 对象访问
const vars = ctx.tego.environment.getVariables();
const apiBasePath = vars.API_BASE_PATH;

// 或者通过 settings 对象（推荐）
const settings = app.settings; // 如果可用
```

**注意：** 环境变量现在通过 `convertEnvToSettings` 函数转换为 Settings 对象，配置结构发生了变化。

### Settings 结构

环境变量现在按类别组织：
- `settings.env.*` - 通用环境变量
- `settings.logger.*` - 日志配置（原 `LOGGER_*`）
- `settings.database.*` - 数据库配置（原 `DB_*`）
- `settings.cache.*` - 缓存配置（原 `CACHE_*`）

---

## 6. Application 架构变更

### 5.1 不再继承 Koa

**变更说明：**
`Application` 类不再继承 `Koa`，而是使用组合模式，内部包含一个 `_koa` 实例。

**影响：**
- `Application` 不再直接是 Koa 实例
- 需要使用 `app.callback()` 获取 Koa 回调函数
- 某些 Koa 特定的方法可能需要通过 `app._koa` 访问（不推荐）

**适配方法：**

**旧代码：**
```typescript
const app = new Application(options);
// app 可以直接作为 Koa 应用使用
```

**新代码：**
```typescript
const app = new Application(options);
// 需要时使用 app.callback()
const callback = app.callback();
```

### 5.2 上下文类型定义变更

**旧类型定义：**
```typescript
declare module 'koa' {
  interface ExtendableContext {
    app: Application;
  }
}
```

**新类型定义：**
```typescript
declare module 'koa' {
  interface ExtendableContext {
    tego: Application;
    db: Database;
    cache: Cache;
    resourcer: Resourcer;
    i18n: any;
    reqId: string;
    logger: winston.Logger;
  }
}
```

---

## 7. 服务迁移

### 变更说明

某些核心服务（如 pub-sub、cache、cron）已迁移到 `module-standard-core` 插件中。这些服务可能不再直接作为 Application 的属性可用。

### 影响的服务

- `app.pubSubManager` - 可能已迁移
- `app.cronJobManager` - 可能已迁移
- `app.cacheManager` - 可能已迁移

### 适配方法

需要检查这些服务是否仍然可用，或者需要通过插件系统访问：

```typescript
// 检查服务是否仍然可用
if (ctx.tego.pubSubManager) {
  // 使用服务
}

// 或者通过插件获取
const plugin = ctx.tego.pm.get('module-standard-core');
// 从插件中获取服务
```

---

## 8. 其他废弃 API

### 7.1 Resourcer 方法废弃

**`resourcer.restApiMiddleware()` → `resourcer.middleware()`**

**废弃方法：**
```typescript
app.use(resourcer.restApiMiddleware({ prefix: '/api' }));
```

**新方法：**
```typescript
app.use(resourcer.middleware());
```

### 7.2 Action 属性废弃

**`action.resourceOf` → `action.sourceId`**

**废弃属性：**
```typescript
const resourceOf = action.resourceOf;
```

**新属性：**
```typescript
const sourceId = action.sourceId;
```

### 7.3 PluginManagerRepository 方法废弃

**`repository.disable()` 已废弃**

不再推荐使用 `repository.disable()` 方法，应该使用标准的更新方法。

---

## 迁移检查清单

### 必须完成的更改

- [ ] 全局替换 `ctx.app` 为 `ctx.tego`
- [ ] 更新所有 `package.json` 脚本：`tachybase` → `tego`
- [ ] 替换 `app.collection()` 为 `app.db.collection()`
- [ ] 替换 `app.resource()` 为 `app.resourcer.define()`
- [ ] 替换 `app.actions()` 为 `app.resourcer.registerActions()`
- [ ] 替换 `app.getPlugin()` 为 `app.pm.get()`
- [ ] 替换 `app.parse()` 为 `app.runAsCLI()`
- [ ] 更新所有 `@tachybase/server` 导入为 `@tego/core`（如果仍在使用）
- [ ] 检查并更新环境变量访问方式
- [ ] 更新类型定义中的 `ctx.app` 为 `ctx.tego`

### 需要验证的更改

- [ ] 验证 `app.pubSubManager` 是否仍然可用
- [ ] 验证 `app.cronJobManager` 是否仍然可用
- [ ] 验证 `app.cacheManager` 是否仍然可用
- [ ] 验证所有中间件是否正常工作
- [ ] 验证所有 Action 处理器是否正常工作
- [ ] 验证所有 Hook 处理器是否正常工作

---

## 常见问题

### Q: 为什么要把 `ctx.app` 改为 `ctx.tego`？

A: 这是为了避免与 Koa 原生的 `ctx.app` 属性冲突，同时使上下文更加清晰，明确表示这是 Tego 应用实例。

### Q: 废弃的方法还能用吗？

A: 废弃的方法目前仍然可用，但会在控制台输出警告。建议尽快迁移到新 API，因为废弃的方法可能在未来的版本中被移除。

### Q: 如何批量替换 `ctx.app`？

A: 可以使用 IDE 的全局查找替换功能，或者使用命令行工具：
```bash
# 使用 sed (Linux/Mac)
find . -type f -name "*.ts" -exec sed -i 's/ctx\.app/ctx.tego/g' {} +

# 使用 PowerShell (Windows)
Get-ChildItem -Recurse -Filter *.ts | ForEach-Object {
  (Get-Content $_.FullName) -replace 'ctx\.app', 'ctx.tego' | Set-Content $_.FullName
}
```

### Q: 环境变量变更会影响现有配置吗？

A: 不会立即影响，因为系统仍然会读取 `.env` 文件。但建议逐步迁移到新的 Settings 对象结构，以获得更好的类型安全和配置管理。

---

## 参考资源

- [Tego 核心仓库](https://github.com/tegojs/tego)
- [Tego Standard 仓库](https://github.com/tegojs/tego-standard)
- 相关提交：
  - `refactor: move ctx.app to ctx.tego`
  - `refactor(core): replace Koa inheritance with EventEmitter`
  - `refactor: rename @tachybase/server to @tego/core`
  - `feat: replace environment variables with js object settings`

---

**最后更新：** 2025-01-27
**适用版本：** tego 1.3.54+ (从 1.3.52 升级)
**目标版本：** tego-standard 适配 1.3.54+
**主要变更提交：**
- `54c107ae5` - Application 架构重构，ctx.app → ctx.tego
- `38a7c962c` - 环境变量配置系统重构

