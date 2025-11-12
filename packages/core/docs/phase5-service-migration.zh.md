# Phase 5: 服务迁移计划

## 概述

将 Tego 核心中的大部分服务迁移到 `@tego/module-standard-core` 插件中，保持核心最小化，仅保留不可替代的核心功能。

## 服务分类

### 保留在核心中的服务

这些服务是 Tego 核心架构的基础，不可替代：

1. **EventBus** - 事件总线（已实现）
2. **PluginManager (pm)** - 插件管理器
3. **CLI (cli)** - 命令行接口
4. **Environment (environment)** - 环境管理
5. **Version (version)** - 版本管理
6. **Logger (_logger)** - 基础日志（ConsoleLogger）

### 迁移到 module-standard-core 的服务

这些服务可以通过插件提供，应该从核心中移除：

1. **Database (db)** - 数据库
2. **DataSourceManager (dataSourceManager)** - 数据源管理器
3. **Resourcer (resourcer)** - 资源管理器
4. **ACL (acl)** - 访问控制
5. **AuthManager (authManager)** - 认证管理器
6. **CacheManager (cacheManager)** - 缓存管理器
7. **Cache (cache)** - 缓存实例
8. **I18n (i18n)** - 国际化
9. **LocaleManager (localeManager/locales)** - 语言环境管理
10. **CronJobManager (cronJobManager)** - 定时任务管理器
11. **PubSubManager (pubSubManager)** - 发布订阅管理器
12. **SyncMessageManager (syncMessageManager)** - 同步消息管理器
13. **NoticeManager (noticeManager)** - 通知管理器
14. **AesEncryptor (aesEncryptor)** - AES 加密器

### 特殊处理的服务

1. **Koa (_koa, context)** - 移到 Gateway 插件
2. **AppSupervisor (_appSupervisor)** - 将被移除
3. **Gateway** - 移到独立插件

## 迁移策略

### 第一步：在 Tego 中添加 DI 容器

```typescript
class Tego {
  /**
   * Dependency injection container
   */
  public container: Container;
  
  constructor(options: TegoOptions) {
    super();
    
    // Initialize DI container
    this.container = Container.of(this.name);
    
    // Initialize EventBus
    this.eventBus = new EventBus();
    
    // Register core services in DI container
    this.registerCoreServices();
    
    this.init();
  }
  
  private registerCoreServices() {
    // Register Tego itself
    this.container.set(TOKENS.Tego, this);
    
    // Register EventBus
    this.container.set(TOKENS.EventBus, this.eventBus);
    
    // Register Logger (basic console logger)
    this.container.set(TOKENS.Logger, this._logger);
    
    // Register Config
    this.container.set(TOKENS.Config, this.options);
    
    // Register Environment
    this.container.set(TOKENS.Environment, this._env);
    
    // Register PluginManager
    this.container.set(TOKENS.PluginManager, this._pm);
    
    // Register CLI
    this.container.set(TOKENS.Command, this._cli);
  }
}
```

### 第二步：更新服务访问方式

将直接属性访问改为通过 DI 容器获取：

#### Before (保留用于向后兼容):
```typescript
tego.db
tego.resourcer
tego.acl
tego.authManager
tego.cacheManager
tego.i18n
```

#### After (新方式):
```typescript
tego.container.get(TOKENS.Database)
tego.container.get(TOKENS.Resourcer)
tego.container.get(TOKENS.ACL)
tego.container.get(TOKENS.AuthManager)
tego.container.get(TOKENS.CacheManager)
tego.container.get(TOKENS.I18n)
```

#### 兼容层 (过渡期):
```typescript
class Tego {
  /**
   * @deprecated Use container.get(TOKENS.Database) instead
   */
  get db(): Database {
    return this.container.get(TOKENS.Database);
  }
  
  /**
   * @deprecated Use container.get(TOKENS.Resourcer) instead
   */
  get resourcer(): Resourcer {
    return this.container.get(TOKENS.Resourcer);
  }
  
  // ... 其他服务的 getter
}
```

### 第三步：module-standard-core 插件注册服务

```typescript
// packages/module-standard-core/src/server/plugin.ts
import { Plugin } from '@tego/core';
import { TOKENS } from '@tego/server';

export class StandardCorePlugin extends Plugin {
  getName(): string {
    return 'module-standard-core';
  }

  async beforeLoad() {
    // 注册服务到 DI 容器
    this.registerServices();
  }

  private registerServices() {
    const { container } = this.tego;
    
    // 注册 DataSourceManager
    container.set(TOKENS.DataSourceManager, new DataSourceManager(this.tego));
    
    // 注册 CacheManager
    container.set(TOKENS.CacheManager, new CacheManager(this.tego.options.cacheManager));
    
    // 注册 AuthManager
    container.set(TOKENS.AuthManager, new AuthManager(this.tego.options.authManager));
    
    // 注册 I18n
    container.set(TOKENS.I18n, this.createI18n());
    
    // 注册 CronJobManager
    container.set(TOKENS.CronJobManager, new CronJobManager(this.tego));
    
    // 注册 PubSubManager
    container.set(TOKENS.PubSubManager, new PubSubManager(this.tego.options.pubSubManager));
    
    // 注册 SyncMessageManager
    container.set(TOKENS.SyncMessageManager, new SyncMessageManager());
    
    // 注册 NoticeManager
    container.set(TOKENS.NoticeManager, new NoticeManager(this.tego));
    
    // 注册 AesEncryptor
    container.set(TOKENS.AesEncryptor, new AesEncryptor());
  }
  
  async load() {
    // 初始化服务
    await this.initializeServices();
  }
  
  private async initializeServices() {
    const { container } = this.tego;
    
    // 初始化 DataSourceManager
    const dataSourceManager = container.get(TOKENS.DataSourceManager);
    await dataSourceManager.load();
    
    // 初始化 CacheManager
    const cacheManager = container.get(TOKENS.CacheManager);
    await cacheManager.load();
    
    // 其他服务初始化...
  }
}
```

### 第四步：从 Tego 中移除服务初始化代码

移除以下内容：
- 服务的私有属性声明（如 `_db`, `_resourcer` 等）
- 服务的初始化代码（在 `init()` 方法中）
- 服务的 getter（保留带 @deprecated 标记的版本用于过渡）

### 第五步：更新插件访问服务的方式

#### Before:
```typescript
class MyPlugin extends Plugin {
  async load() {
    const db = this.tego.db;
    const acl = this.tego.acl;
  }
}
```

#### After:
```typescript
class MyPlugin extends Plugin {
  async load() {
    const db = this.tego.container.get(TOKENS.Database);
    const acl = this.tego.container.get(TOKENS.ACL);
  }
}
```

## 实施顺序

1. ✅ **Phase 4 完成**: EventBus 集成
2. **Phase 5.1**: 在 Tego 中添加 DI 容器
3. **Phase 5.2**: 注册核心服务到容器
4. **Phase 5.3**: 实现 module-standard-core 插件
5. **Phase 5.4**: 添加兼容层 getter
6. **Phase 5.5**: 移除服务初始化代码
7. **Phase 5.6**: 更新文档和迁移指南

## 向后兼容性

### 过渡期（Tego 2.0 - 2.x）
- 保留所有 getter 方法，标记为 @deprecated
- getter 内部通过 DI 容器获取服务
- 插件可以继续使用 `tego.db` 等方式访问

### 未来版本（Tego 3.0）
- 移除 deprecated getter
- 强制使用 DI 容器访问服务

## 收益

1. **核心最小化**: Tego 核心只保留必要功能
2. **插件化**: 所有业务服务通过插件提供
3. **可替换性**: 服务可以被其他实现替换
4. **测试性**: 更容易 mock 和测试
5. **解耦**: 服务之间通过 DI 容器解耦
6. **灵活性**: 用户可以选择不加载某些服务

## 风险与挑战

1. **循环依赖**: 服务之间可能存在循环依赖
   - 解决方案: 使用延迟注入（Lazy Injection）
   
2. **初始化顺序**: 服务初始化顺序很重要
   - 解决方案: 在 module-standard-core 中明确定义初始化顺序
   
3. **性能**: DI 容器可能带来性能开销
   - 解决方案: 使用单例模式，避免重复创建
   
4. **迁移成本**: 现有插件需要更新
   - 解决方案: 提供兼容层和详细迁移指南

## 测试计划

1. **单元测试**: 测试 DI 容器的注册和解析
2. **集成测试**: 测试 module-standard-core 插件的服务注册
3. **兼容性测试**: 测试 deprecated getter 的向后兼容性
4. **性能测试**: 测试 DI 容器的性能影响

## 文档更新

1. **API 文档**: 更新服务访问方式
2. **迁移指南**: 提供从旧方式到新方式的迁移步骤
3. **最佳实践**: 推荐使用 DI 容器的最佳实践
4. **示例代码**: 提供使用 DI 容器的示例

