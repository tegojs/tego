# DI 容器与事件总线设计方案

## 概述

TachyBase 2.0 将采用显式注册的 DI 容器模式，取消类似 NestJS 的自动扫描机制，改为在 Tego 启动时手动注册服务。同时，将当前基于 `AsyncEmitter` mixin 的事件系统重构为统一的事件总线服务，通过容器注入到需要的组件中。

## DI 容器设计

### 核心原则

1. **显式注册，无自动扫描**
   - 不使用装饰器扫描或反射机制自动发现服务。
   - 所有服务在 Tego 启动时通过代码显式注册到容器。
   - 插件在 `beforeLoad` / `load` 阶段注册自己的服务。

2. **生命周期绑定**
   - 容器随 Tego 实例创建而创建。
   - Tego 重启（`restart()`）时，容器销毁并重新创建。
   - 插件卸载时，相关服务从容器中注销。

3. **作用域支持**
   - **Singleton（单例）**：整个 Tego 实例共享一个实例（如 Logger、EventBus、ConfigProvider）。
   - **Transient（瞬态）**：每次解析创建新实例（如请求处理器、临时计算服务）。
   - **Scoped（作用域）**：在特定作用域内共享（如请求上下文、插件上下文）。

4. **依赖解析**
   - 支持构造函数注入、属性注入、方法注入。
   - 支持延迟解析（Lazy Resolution）。
   - 支持可选依赖（Optional Dependencies）。

### 容器接口设计

```typescript
interface IContainer {
  // 注册服务
  register<T>(token: Token<T>, provider: Provider<T>, options?: RegistrationOptions): void;
  
  // 解析服务
  resolve<T>(token: Token<T>): T;
  
  // 检查服务是否已注册
  has<T>(token: Token<T>): boolean;
  
  // 注销服务
  unregister<T>(token: Token<T>): void;
  
  // 创建子容器（用于作用域）
  createChild(): IContainer;
  
  // 销毁容器
  dispose(): Promise<void>;
}

type Token<T> = string | symbol | Constructable<T>;

interface Provider<T> {
  useClass?: Constructable<T>;
  useFactory?: (container: IContainer) => T | Promise<T>;
  useValue?: T;
}

interface RegistrationOptions {
  scope?: 'singleton' | 'transient' | 'scoped';
  tags?: string[];
  dispose?: (instance: T) => void | Promise<void>;
}
```

### 注册时机

#### 1. 核心服务注册（Tego 初始化阶段）
```typescript
class Tego {
  private container: IContainer;

  constructor(options: TegoOptions) {
    // 创建容器
    this.container = new Container();
    
    // 注册核心服务
    this.registerCoreServices();
    
    // 注册配置
    this.container.register('config', {
      useValue: this.resolveConfig(options)
    }, { scope: 'singleton' });
  }

  private registerCoreServices() {
    // 事件总线
    this.container.register('eventBus', {
      useClass: EventBus
    }, { scope: 'singleton' });
    
    // 日志服务（默认实现）
    this.container.register('logger', {
      useFactory: (container) => new ConsoleLogger()
    }, { scope: 'singleton' });
    
    // 生命周期管理器
    this.container.register('lifecycleManager', {
      useClass: LifecycleManager
    }, { scope: 'singleton' });
    
    // 插件注册表
    this.container.register('pluginRegistry', {
      useClass: PluginRegistry
    }, { scope: 'singleton' });
    
    // CLI 执行器
    this.container.register('cliExecutor', {
      useClass: CLIExecutor
    }, { scope: 'singleton' });
    
    // 环境管理器
    this.container.register('environment', {
      useValue: new Environment()
    }, { scope: 'singleton' });
  }
}
```

#### 2. 插件服务注册（插件加载阶段）
```typescript
class MyPlugin extends Plugin {
  async beforeLoad() {
    const container = this.app.container;
    
    // 注册插件提供的服务
    container.register('myService', {
      useClass: MyService
    }, { 
      scope: 'singleton',
      tags: ['plugin:my-plugin']
    });
    
    // 注册数据库服务（如果是数据库插件）
    container.register('database', {
      useFactory: async (container) => {
        const config = container.resolve('config');
        return await createDatabase(config.database);
      }
    }, { 
      scope: 'singleton',
      dispose: async (db) => await db.close()
    });
  }
  
  async load() {
    // 解析依赖的服务
    const eventBus = this.app.container.resolve('eventBus');
    const logger = this.app.container.resolve('logger');
    
    // 使用服务
    eventBus.on('someEvent', (data) => {
      logger.info('Event received', data);
    });
  }
}
```

#### 3. 标准插件注册（module-standard-core）
```typescript
// @tego/module-standard-core 插件
class StandardCorePlugin extends Plugin {
  async beforeLoad() {
    const container = this.app.container;
    
    // 注册数据库服务
    container.register('database', {
      useFactory: async (container) => {
        const config = container.resolve('config');
        return await createDatabase(config.database);
      }
    }, { scope: 'singleton' });
    
    // 注册缓存服务
    container.register('cache', {
      useFactory: async (container) => {
        const config = container.resolve('config');
        return await createCache(config.cache);
      }
    }, { scope: 'singleton' });
    
    // 注册 ACL 服务
    container.register('acl', {
      useClass: ACL
    }, { scope: 'singleton' });
    
    // 注册国际化服务
    container.register('i18n', {
      useFactory: (container) => {
        const config = container.resolve('config');
        return createI18n(config.i18n);
      }
    }, { scope: 'singleton' });
  }
}
```

### 容器销毁与重建

#### 重启流程
```typescript
class Tego {
  async restart(options: RestartOptions = {}) {
    // 1. 触发 beforeStop 事件
    await this.eventBus.emit('beforeStop', this, options);
    
    // 2. 销毁容器（自动调用所有服务的 dispose 钩子）
    await this.container.dispose();
    
    // 3. 重新创建容器
    this.container = new Container();
    
    // 4. 重新注册核心服务
    this.registerCoreServices();
    
    // 5. 重新加载插件（插件会重新注册服务）
    await this.reload(options);
    
    // 6. 重新启动
    await this.start(options);
    
    // 7. 触发 __restarted 事件
    this.eventBus.emit('__restarted', this, options);
  }
}
```

#### 服务清理
```typescript
// 容器销毁时自动调用
class Container implements IContainer {
  async dispose() {
    // 按注册顺序的逆序销毁服务
    for (const [token, registration] of this.registrations.reverse()) {
      if (registration.options?.dispose && registration.instance) {
        await registration.options.dispose(registration.instance);
      }
    }
    
    // 清空注册表
    this.registrations.clear();
  }
}

// 示例：数据库服务的清理
container.register('database', {
  useFactory: async (container) => {
    const db = await createDatabase(config);
    return db;
  }
}, {
  scope: 'singleton',
  dispose: async (db) => {
    await db.close(); // 关闭数据库连接
  }
});
```

## 基于 @tachybase/di 的容器实现

### 使用现有 DI 包

Tego 2.0 将基于 `@tego/di` 包，该包已经支持 **Stage 3 Decorators**（TypeScript 5.0+），提供了完善的依赖注入能力。

#### @tego/di 核心特性

1. **Stage 3 Decorators 支持**
   - 使用最新的 ECMAScript 装饰器标准
   - 不需要 `experimentalDecorators` 或 `emitDecoratorMetadata`
   - 更好的类型推断和性能

2. **核心装饰器**
   - `@Service()`: 标记类为可注入服务
   - `@Inject()`: 注入依赖到属性
   - `@InjectMany()`: 注入多个同类型服务

3. **容器特性**
   - 支持多容器实例
   - 支持作用域（singleton, container, transient）
   - 支持工厂函数
   - 支持 Token 标识符

### 容器封装与增强

虽然使用 `@tego/di`，但需要封装以适配 Tego 的需求：

```typescript
import { Container as DIContainer, Token, Service, Inject } from '@tego/di';

class TegoContainer {
  private diContainer: DIContainer;
  private disposeHooks: Map<any, () => Promise<void>> = new Map();
  
  constructor(id: string) {
    this.diContainer = new DIContainer(id);
  }
  
  // 注册服务（支持 dispose 钩子）
  register<T>(
    token: string | Token<T> | { new(...args: any[]): T },
    provider: ServiceProvider<T>,
    options?: RegistrationOptions
  ): void {
    // 转换为 @tego/di 的格式
    const serviceMetadata = {
      id: token,
      type: provider.useClass,
      factory: provider.useFactory,
      value: provider.useValue,
      scope: options?.scope === 'singleton' ? 'singleton' : 'container',
      multiple: false,
    };
    
    this.diContainer.set(serviceMetadata);
    
    // 存储 dispose 钩子
    if (options?.dispose) {
      this.disposeHooks.set(token, async () => {
        const instance = this.diContainer.get(token);
        await options.dispose!(instance);
      });
    }
  }
  
  // 解析服务
  resolve<T>(token: string | Token<T> | { new(...args: any[]): T }): T {
    return this.diContainer.get(token);
  }
  
  // 检查服务是否存在
  has<T>(token: string | Token<T> | { new(...args: any[]): T }): boolean {
    return this.diContainer.has(token);
  }
  
  // 销毁容器
  async dispose(): Promise<void> {
    // 执行所有 dispose 钩子
    for (const [token, disposeHook] of this.disposeHooks) {
      try {
        await disposeHook();
      } catch (error) {
        console.error(`Error disposing service ${String(token)}:`, error);
      }
    }
    
    this.disposeHooks.clear();
    this.diContainer.reset();
  }
  
  // 获取原始容器（用于高级用法）
  get raw(): DIContainer {
    return this.diContainer;
  }
}

interface ServiceProvider<T> {
  useClass?: { new(...args: any[]): T };
  useFactory?: (container: TegoContainer) => T | Promise<T>;
  useValue?: T;
}

interface RegistrationOptions {
  scope?: 'singleton' | 'transient' | 'scoped';
  tags?: string[];
  dispose?: (instance: any) => void | Promise<void>;
}
```

### Plugin 便捷注入方式

为 Plugin 基类提供装饰器和辅助方法：

```typescript
import { Service, Inject } from '@tachybase/di';

// 定义常用服务的 Token
export const TOKENS = {
  EventBus: new Token<IEventBus>('eventBus'),
  Logger: new Token<ILogger>('logger'),
  Config: new Token<IConfig>('config'),
  LifecycleManager: new Token<ILifecycleManager>('lifecycleManager'),
};

// Plugin 基类增强
class Plugin {
  // 通过装饰器注入
  @Inject(() => TOKENS.EventBus)
  protected eventBus!: IEventBus;
  
  @Inject(() => TOKENS.Logger)
  protected logger!: ILogger;
  
  // 通过方法获取
  protected getService<T>(token: string | Token<T> | { new(...args: any[]): T }): T {
    return this.app.container.resolve(token);
  }
  
  // 注册服务的便捷方法
  protected registerService<T>(
    token: string | Token<T> | { new(...args: any[]): T },
    provider: ServiceProvider<T>,
    options?: RegistrationOptions
  ): void {
    this.app.container.register(token, provider, options);
  }
}

// 插件使用示例
@Service()
class MyService {
  @Inject(() => TOKENS.Logger)
  private logger!: ILogger;
  
  async doSomething() {
    this.logger.info('Doing something...');
  }
}

class MyPlugin extends Plugin {
  async beforeLoad() {
    // 方式 1：注册类（自动注入依赖）
    this.registerService(MyService, { useClass: MyService });
    
    // 方式 2：注册工厂函数
    this.registerService('myFactory', {
      useFactory: (container) => {
        const logger = container.resolve(TOKENS.Logger);
        return new MyFactoryService(logger);
      }
    });
    
    // 方式 3：注册值
    this.registerService('myConfig', {
      useValue: { key: 'value' }
    });
  }
  
  async load() {
    // 使用注入的服务
    this.eventBus.on('someEvent', async (data) => {
      this.logger.info('Event received', data);
    });
    
    // 或者手动获取
    const myService = this.getService(MyService);
    await myService.doSomething();
  }
}
```

## 事件总线设计

### 核心原则

1. **取消 AsyncEmitter Mixin**
   - 不再使用 `applyMixins(Application, [AsyncEmitter])`。
   - `Application` 不再继承 `EventEmitter`。
   - 所有事件通过统一的 `EventBus` 服务处理。

2. **容器注入**
   - `EventBus` 作为单例服务注册到容器。
   - 需要事件能力的组件通过容器解析 `EventBus`。

3. **类型安全**
   - 支持事件名称和参数的类型定义。
   - 编译时检查事件订阅和发布的类型匹配。

4. **统一异步 API**
   - **只保留 `emitAsync` 方法**，取消 `emit` 同步方法。
   - 所有事件处理器都是异步的，符合 Node.js 生态习惯。
   - 不需要等待的场景可以不 `await` 调用结果。

### EventBus 接口设计

```typescript
interface IEventBus {
  // 订阅事件
  on<T = any>(event: string, handler: EventHandler<T>, options?: SubscribeOptions): Unsubscribe;
  
  // 订阅一次性事件
  once<T = any>(event: string, handler: EventHandler<T>): Unsubscribe;
  
  // 取消订阅
  off(event: string, handler: EventHandler): void;
  
  // 发布异步事件（统一 API）
  emitAsync(event: string, ...args: any[]): Promise<void>;
  
  // 获取事件监听器数量
  listenerCount(event: string): number;
  
  // 清除所有监听器
  removeAllListeners(event?: string): void;
}

type EventHandler<T = any> = (data: T, ...args: any[]) => void | Promise<void>;

type Unsubscribe = () => void;

interface SubscribeOptions {
  priority?: number; // 优先级（数字越大越先执行）
  once?: boolean;    // 是否只执行一次
}
```

### 类型安全的事件定义

```typescript
// 定义事件类型映射
interface TegoEvents {
  'beforeLoad': [tego: Tego, options: LoadOptions];
  'afterLoad': [tego: Tego, options: LoadOptions];
  'beforeStart': [tego: Tego, options: StartOptions];
  'afterStart': [tego: Tego, options: StartOptions];
  'beforeStop': [tego: Tego, options: StopOptions];
  'afterStop': [tego: Tego, options: StopOptions];
  'beforeDestroy': [tego: Tego, options: DestroyOptions];
  'afterDestroy': [tego: Tego, options: DestroyOptions];
  '__started': [tego: Tego, data: { maintainingStatus: any; options: any }];
  '__restarted': [tego: Tego, options: RestartOptions];
}

// 类型安全的 EventBus
class TypedEventBus implements IEventBus {
  on<K extends keyof TegoEvents>(
    event: K,
    handler: (...args: TegoEvents[K]) => void | Promise<void>,
    options?: SubscribeOptions
  ): Unsubscribe {
    // 实现
  }
  
  emitAsync<K extends keyof TegoEvents>(
    event: K,
    ...args: TegoEvents[K]
  ): Promise<void> {
    // 实现
  }
}
```

### 事件总线实现示例

```typescript
class EventBus implements IEventBus {
  private handlers = new Map<string, Set<EventHandlerRegistration>>();
  
  on<T = any>(
    event: string,
    handler: EventHandler<T>,
    options: SubscribeOptions = {}
  ): Unsubscribe {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    
    const registration: EventHandlerRegistration = {
      handler,
      priority: options.priority ?? 0,
      once: options.once ?? false
    };
    
    this.handlers.get(event)!.add(registration);
    
    // 返回取消订阅函数
    return () => this.off(event, handler);
  }
  
  once<T = any>(event: string, handler: EventHandler<T>): Unsubscribe {
    return this.on(event, handler, { once: true });
  }
  
  off(event: string, handler: EventHandler): void {
    const handlers = this.handlers.get(event);
    if (!handlers) return;
    
    for (const registration of handlers) {
      if (registration.handler === handler) {
        handlers.delete(registration);
        break;
      }
    }
  }
  
  async emitAsync(event: string, ...args: any[]): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers) return;
    
    // 按优先级排序
    const sortedHandlers = Array.from(handlers).sort(
      (a, b) => b.priority - a.priority
    );
    
    for (const registration of sortedHandlers) {
      try {
        await registration.handler(...args);
        
        if (registration.once) {
          handlers.delete(registration);
        }
      } catch (error) {
        console.error(`Error in async event handler for "${event}":`, error);
        throw error; // 异步事件中断执行
      }
    }
  }
  
  listenerCount(event: string): number {
    return this.handlers.get(event)?.size ?? 0;
  }
  
  removeAllListeners(event?: string): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }
}

interface EventHandlerRegistration {
  handler: EventHandler;
  priority: number;
  once: boolean;
}
```

### 迁移示例

#### 迁移前（使用 AsyncEmitter Mixin）
```typescript
class Application extends EventEmitter implements AsyncEmitter {
  declare emitAsync: (event: string | symbol, ...args: any[]) => Promise<boolean>;
  
  async load(options?: any) {
    await this.emitAsync('beforeLoad', this, options);
    // ...
    await this.emitAsync('afterLoad', this, options);
  }
}

applyMixins(Application, [AsyncEmitter]);

// 插件中订阅事件
class MyPlugin extends Plugin {
  async load() {
    this.app.on('beforeLoad', async (app, options) => {
      // 处理事件
    });
  }
}
```

#### 迁移后（使用 EventBus）
```typescript
class Tego {
  private eventBus: IEventBus;
  
  constructor(options: TegoOptions) {
    this.container = new Container();
    this.eventBus = new EventBus();
    this.container.register('eventBus', { useValue: this.eventBus }, { scope: 'singleton' });
  }
  
  async load(options?: any) {
    await this.eventBus.emitAsync('beforeLoad', this, options);
    // ...
    await this.eventBus.emitAsync('afterLoad', this, options);
  }
}

// 插件中订阅事件
class MyPlugin extends Plugin {
  async load() {
    const eventBus = this.app.container.resolve<IEventBus>('eventBus');
    
    eventBus.on('beforeLoad', async (app, options) => {
      // 处理事件
    });
  }
}
```

### 事件清理机制

#### 插件卸载时自动清理
```typescript
class Plugin {
  private eventUnsubscribers: Unsubscribe[] = [];
  
  protected subscribeEvent<T>(
    event: string,
    handler: EventHandler<T>,
    options?: SubscribeOptions
  ): void {
    const eventBus = this.app.container.resolve<IEventBus>('eventBus');
    const unsubscribe = eventBus.on(event, handler, options);
    this.eventUnsubscribers.push(unsubscribe);
  }
  
  async beforeDisable() {
    // 自动取消所有订阅
    for (const unsubscribe of this.eventUnsubscribers) {
      unsubscribe();
    }
    this.eventUnsubscribers = [];
  }
}
```

#### Tego 重启时清理
```typescript
class Tego {
  async restart(options: RestartOptions = {}) {
    // 清理所有事件监听器
    this.eventBus.removeAllListeners();
    
    // 销毁容器
    await this.container.dispose();
    
    // 重新创建
    this.container = new Container();
    this.eventBus = new EventBus();
    this.container.register('eventBus', { useValue: this.eventBus });
    
    // 重新加载
    await this.reload(options);
    await this.start(options);
  }
}
```

## 与现有代码的对比

### 当前实现的问题

1. **EventEmitter 继承污染**
   - `Application` 继承 `EventEmitter`，导致实例上有大量不需要的方法。
   - 难以控制事件的生命周期和清理。

2. **AsyncEmitter Mixin 复杂性**
   - 使用 `applyMixins` 增加了代码复杂度。
   - 类型推导不够友好，需要 `declare emitAsync`。

3. **事件清理困难**
   - `reInitEvents()` 方法依赖 `_reinitializable` 标记，不够通用。
   - 重启时事件监听器可能泄漏。

4. **缺乏类型安全**
   - 事件名称和参数类型无法在编译时检查。
   - 容易出现事件名拼写错误或参数不匹配。

### 新实现的优势

1. **职责清晰**
   - `Tego` 不再继承 `EventEmitter`，只持有 `EventBus` 引用。
   - 事件能力通过容器注入，易于测试和替换。

2. **生命周期可控**
   - 容器销毁时自动清理所有服务（包括事件监听器）。
   - 插件卸载时自动取消订阅。

3. **类型安全**
   - 通过 `TegoEvents` 接口定义事件类型。
   - 编译时检查事件名称和参数。

4. **更好的扩展性**
   - 可以轻松替换 `EventBus` 实现（如使用 Redis Pub/Sub）。
   - 支持事件优先级、一次性订阅等高级特性。

## 迁移步骤

### 阶段 1：定义接口（2.0 Alpha）
1. 定义 `IContainer` 接口及实现。
2. 定义 `IEventBus` 接口及实现。
3. 定义 `TegoEvents` 类型映射。

### 阶段 2：核心重构（2.0 Alpha）
1. 创建 `Tego` 类（重命名自 `Application`）。
2. 移除 `EventEmitter` 继承和 `AsyncEmitter` mixin。
3. 在构造函数中创建容器和事件总线。
4. 将所有 `this.emitAsync()` 改为 `this.eventBus.emitAsync()`。
5. 将所有 `this.on()` 改为 `this.eventBus.on()`。

### 阶段 3：插件适配（2.0 Beta）
1. 更新 `Plugin` 基类，提供 `subscribeEvent()` 辅助方法。
2. 更新所有内置插件，使用容器解析 `EventBus`。
3. 提供迁移指南和示例代码。

### 阶段 4：清理与优化（2.0 GA）
1. 移除 `reInitEvents()` 等旧的事件清理逻辑。
2. 移除 `applyMixins` 相关代码。
3. 优化事件总线性能（批量发布、延迟执行等）。
4. 完善文档和测试。

## 配置示例

### Tego 配置
```typescript
const tego = new Tego({
  name: 'main',
  
  // 容器配置
  container: {
    enableValidation: true, // 启用依赖验证
    enableAutoDispose: true // 启用自动清理
  },
  
  // 事件总线配置
  eventBus: {
    maxListeners: 100, // 最大监听器数量
    errorHandler: (error, event) => {
      console.error(`Event error in "${event}":`, error);
    }
  },
  
  // 插件配置
  plugins: [
    '@tego/module-standard-core',
    '@tego/plugin-http-server',
    '@tego/plugin-websocket'
  ]
});
```

### 插件配置
```typescript
class MyPlugin extends Plugin {
  async beforeLoad() {
    const container = this.app.container;
    
    // 注册服务
    container.register('myService', {
      useFactory: (container) => {
        const logger = container.resolve('logger');
        const eventBus = container.resolve('eventBus');
        return new MyService(logger, eventBus);
      }
    }, {
      scope: 'singleton',
      tags: ['plugin:my-plugin'],
      dispose: async (service) => await service.close()
    });
  }
  
  async load() {
    // 订阅事件
    this.subscribeEvent('beforeStart', async (tego, options) => {
      const myService = this.app.container.resolve('myService');
      await myService.initialize();
    });
  }
}
```

## 收益总结

1. **更清晰的架构**
   - 容器和事件总线职责明确，易于理解和维护。
   - 移除 mixin 和继承，降低代码复杂度。

2. **更好的可测试性**
   - 容器和事件总线可以轻松 mock。
   - 插件测试不再依赖全局状态。

3. **更强的类型安全**
   - 事件名称和参数类型在编译时检查。
   - 减少运行时错误。

4. **更灵活的扩展**
   - 可以替换容器和事件总线实现。
   - 支持分布式事件（通过 Redis Pub/Sub 等）。

5. **更好的生命周期管理**
   - 容器销毁时自动清理所有服务。
   - 插件卸载时自动取消事件订阅。

## 迁移检查清单

- [ ] 定义 `IContainer` 接口及实现。
- [ ] 定义 `IEventBus` 接口及实现。
- [ ] 定义 `TegoEvents` 类型映射。
- [ ] 创建 `Tego` 类并移除 `EventEmitter` 继承。
- [ ] 重构所有 `emitAsync()` 调用。
- [ ] 重构所有 `on()` / `once()` 调用。
- [ ] 更新 `Plugin` 基类提供事件订阅辅助方法。
- [ ] 更新所有内置插件使用容器和事件总线。
- [ ] 编写迁移指南和示例代码。
- [ ] 编写单元测试和集成测试。
- [ ] 更新文档和 API 参考。
- [ ] 发布 2.0 Alpha 版本并收集反馈。
- [ ] 根据反馈优化容器和事件总线 API。
- [ ] 在 2.0 GA 前完成所有清理工作。

