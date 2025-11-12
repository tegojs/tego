# Phase 5 实施说明

## 当前状态（Tego 2.0）

### 已完成

1. ✅ **DI 容器集成**
   - Tego 类中添加了 `container` 属性
   - 容器在构造函数中初始化
   - 核心服务自动注册到容器

2. ✅ **服务注册**
   - `registerCoreServices()` - 注册核心服务（Tego, EventBus, Config）
   - `registerInitializedServices()` - 注册初始化后的服务

3. ✅ **module-standard-core 插件**
   - 创建了插件结构
   - 添加了服务验证逻辑
   - 作为未来服务迁移的占位符

### 服务访问方式

#### 方式 1: 直接属性访问（当前，向后兼容）
```typescript
const db = tego.db;
const acl = tego.acl;
const i18n = tego.i18n;
```

#### 方式 2: DI 容器访问（推荐，Tego 2.0+）
```typescript
const { TOKENS } = require('@tego/core');
const db = tego.container.get(TOKENS.Database);
const acl = tego.container.get(TOKENS.ACL);
const i18n = tego.container.get(TOKENS.I18n);
```

### 注册的服务

#### 核心服务（保留在 core）
- `TOKENS.Tego` - Tego 实例
- `TOKENS.EventBus` - 事件总线
- `TOKENS.Logger` - 日志服务
- `TOKENS.Config` - 配置
- `TOKENS.Environment` - 环境
- `TOKENS.PluginManager` - 插件管理器
- `TOKENS.Command` - CLI

#### 标准服务（将来移到 plugin）
- `TOKENS.DataSourceManager` - 数据源管理器
- `TOKENS.CronJobManager` - 定时任务管理器
- `TOKENS.I18n` - 国际化
- `TOKENS.AuthManager` - 认证管理器
- `TOKENS.PubSubManager` - 发布订阅管理器
- `TOKENS.SyncMessageManager` - 同步消息管理器
- `TOKENS.NoticeManager` - 通知管理器
- `TOKENS.AesEncryptor` - AES 加密器
- `TOKENS.CacheManager` - 缓存管理器

## 架构决策

### 为什么不立即移除服务属性？

1. **向后兼容性**: 现有插件和应用依赖这些属性
2. **渐进式迁移**: 允许逐步迁移到 DI 容器
3. **稳定性**: 减少破坏性变更的风险
4. **测试时间**: 需要充分测试 DI 容器实现

### 为什么服务仍在 core 中初始化？

1. **依赖关系复杂**: 服务之间有复杂的依赖关系
2. **初始化顺序**: 需要精确控制初始化顺序
3. **循环依赖**: 某些服务存在循环依赖
4. **测试覆盖**: 需要确保所有场景都被测试

## 迁移路径

### Tego 2.0（当前）
- ✅ DI 容器可用
- ✅ 服务注册到容器
- ✅ 保留直接属性访问
- ✅ 推荐使用 DI 容器
- ⚠️ 属性访问标记为 @deprecated

### Tego 2.x（过渡期）
- 逐步移动服务初始化到 module-standard-core
- 保留 getter 作为兼容层
- getter 内部使用 DI 容器
- 提供迁移工具和文档

### Tego 3.0（未来）
- 完全移除服务属性
- 强制使用 DI 容器
- 服务完全由插件提供
- 核心只保留最小功能

## 插件开发者指南

### 推荐做法

```typescript
import { Plugin } from '@tego/core';
import { TOKENS } from '@tego/server';

export class MyPlugin extends Plugin {
  async load() {
    // 推荐：使用 DI 容器
    const db = this.tego.container.get(TOKENS.Database);
    const acl = this.tego.container.get(TOKENS.ACL);
    
    // 也可以：直接访问（将来会废弃）
    const i18n = this.tego.i18n;
  }
}
```

### 注册自定义服务

```typescript
export class MyPlugin extends Plugin {
  async beforeLoad() {
    // 注册自定义服务
    this.tego.container.set('myService', new MyService());
  }
  
  async load() {
    // 使用自定义服务
    const myService = this.tego.container.get('myService');
  }
}
```

## 技术细节

### DI 容器实现

- 使用 `@tego/di` 包
- 基于 Stage 3 Decorators
- 支持单例、瞬态、作用域
- 支持工厂函数
- 支持 dispose 钩子

### 容器生命周期

1. **创建**: Tego 构造函数中创建
2. **注册**: 分两阶段注册服务
   - 构造函数中：Tego, EventBus, Config
   - init() 后：其他所有服务
3. **使用**: 通过 `container.get()` 获取
4. **销毁**: Tego 销毁时销毁容器

### 服务解析

```typescript
// 直接获取
const service = container.get(TOKENS.ServiceName);

// 检查是否存在
if (container.has(TOKENS.ServiceName)) {
  const service = container.get(TOKENS.ServiceName);
}

// 设置服务
container.set(TOKENS.ServiceName, serviceInstance);
```

## 已知问题

### 1. 类型推断

当前 `container.get()` 返回 `any`，需要手动类型断言：

```typescript
const db = container.get(TOKENS.Database) as Database;
```

**解决方案**: TOKENS 定义中包含类型信息。

### 2. 循环依赖

某些服务可能存在循环依赖。

**解决方案**: 使用延迟注入或重构服务依赖关系。

### 3. 初始化顺序

服务初始化顺序很重要。

**解决方案**: 在 `registerInitializedServices()` 中明确顺序。

## 测试建议

### 单元测试

```typescript
import { Container } from '@tego/di';
import { TOKENS } from '@tego/core';

describe('Service Registration', () => {
  it('should register all core services', () => {
    const container = Container.of('test');
    // ... 测试服务注册
  });
});
```

### 集成测试

```typescript
describe('Tego with DI Container', () => {
  it('should access services via container', async () => {
    const tego = new Tego(options);
    await tego.load();
    
    const db = tego.container.get(TOKENS.Database);
    expect(db).toBeDefined();
  });
});
```

## 性能考虑

1. **容器开销**: DI 容器解析有轻微开销
2. **单例缓存**: 单例服务只创建一次
3. **延迟加载**: 服务按需创建
4. **内存占用**: 容器维护服务引用

## 下一步

1. **监控使用情况**: 收集 DI 容器使用数据
2. **收集反馈**: 从插件开发者收集反馈
3. **改进文档**: 完善迁移指南和最佳实践
4. **计划迁移**: 规划服务迁移到 plugin 的时间表
5. **工具支持**: 开发迁移工具和代码生成器

## 参考资料

- [Phase 5 迁移计划](./phase5-service-migration.zh.md)
- [DI 容器设计](./di-container-eventbus-plan.zh.md)
- [@tego/di 文档](../../di/README.md)
- [Plugin 开发指南](./plugin-lifecycle.zh.md)

