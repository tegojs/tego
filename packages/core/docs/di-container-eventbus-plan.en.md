# DI Container & Event Bus Design Plan

## Overview

TachyBase 2.0 will adopt an explicit registration DI container pattern, eliminating NestJS-style automatic scanning. Services will be manually registered during Tego startup. Additionally, the current `AsyncEmitter` mixin-based event system will be refactored into a unified event bus service, injected via the container into components that need it.

## DI Container Design

### Core Principles

1. **Explicit Registration, No Auto-Scanning**
   - No decorator scanning or reflection mechanisms for automatic service discovery.
   - All services explicitly registered to the container via code during Tego startup.
   - Plugins register their services during `beforeLoad` / `load` phases.

2. **Lifecycle Binding**
   - Container created when Tego instance is created.
   - Container destroyed and recreated when Tego restarts (`restart()`).
   - Services unregistered from container when plugins are unloaded.

3. **Scope Support**
   - **Singleton**: Shared across the entire Tego instance (e.g., Logger, EventBus, ConfigProvider).
   - **Transient**: New instance created on each resolution (e.g., request handlers, temporary computation services).
   - **Scoped**: Shared within a specific scope (e.g., request context, plugin context).

4. **Dependency Resolution**
   - Support constructor injection, property injection, method injection.
   - Support lazy resolution.
   - Support optional dependencies.

### Container Interface Design

```typescript
interface IContainer {
  // Register service
  register<T>(token: Token<T>, provider: Provider<T>, options?: RegistrationOptions): void;
  
  // Resolve service
  resolve<T>(token: Token<T>): T;
  
  // Check if service is registered
  has<T>(token: Token<T>): boolean;
  
  // Unregister service
  unregister<T>(token: Token<T>): void;
  
  // Create child container (for scoping)
  createChild(): IContainer;
  
  // Dispose container
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

### Registration Timing

#### 1. Core Service Registration (Tego Initialization Phase)
```typescript
class Tego {
  private container: IContainer;

  constructor(options: TegoOptions) {
    // Create container
    this.container = new Container();
    
    // Register core services
    this.registerCoreServices();
    
    // Register configuration
    this.container.register('config', {
      useValue: this.resolveConfig(options)
    }, { scope: 'singleton' });
  }

  private registerCoreServices() {
    // Event bus
    this.container.register('eventBus', {
      useClass: EventBus
    }, { scope: 'singleton' });
    
    // Logger service (default implementation)
    this.container.register('logger', {
      useFactory: (container) => new ConsoleLogger()
    }, { scope: 'singleton' });
    
    // Lifecycle manager
    this.container.register('lifecycleManager', {
      useClass: LifecycleManager
    }, { scope: 'singleton' });
    
    // Plugin registry
    this.container.register('pluginRegistry', {
      useClass: PluginRegistry
    }, { scope: 'singleton' });
    
    // CLI executor
    this.container.register('cliExecutor', {
      useClass: CLIExecutor
    }, { scope: 'singleton' });
    
    // Environment manager
    this.container.register('environment', {
      useValue: new Environment()
    }, { scope: 'singleton' });
  }
}
```

#### 2. Plugin Service Registration (Plugin Loading Phase)
```typescript
class MyPlugin extends Plugin {
  async beforeLoad() {
    const container = this.app.container;
    
    // Register plugin-provided services
    container.register('myService', {
      useClass: MyService
    }, { 
      scope: 'singleton',
      tags: ['plugin:my-plugin']
    });
    
    // Register database service (if database plugin)
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
    // Resolve dependent services
    const eventBus = this.app.container.resolve('eventBus');
    const logger = this.app.container.resolve('logger');
    
    // Use services
    eventBus.on('someEvent', (data) => {
      logger.info('Event received', data);
    });
  }
}
```

#### 3. Standard Plugin Registration (module-standard-core)
```typescript
// @tego/module-standard-core plugin
class StandardCorePlugin extends Plugin {
  async beforeLoad() {
    const container = this.app.container;
    
    // Register database service
    container.register('database', {
      useFactory: async (container) => {
        const config = container.resolve('config');
        return await createDatabase(config.database);
      }
    }, { scope: 'singleton' });
    
    // Register cache service
    container.register('cache', {
      useFactory: async (container) => {
        const config = container.resolve('config');
        return await createCache(config.cache);
      }
    }, { scope: 'singleton' });
    
    // Register ACL service
    container.register('acl', {
      useClass: ACL
    }, { scope: 'singleton' });
    
    // Register i18n service
    container.register('i18n', {
      useFactory: (container) => {
        const config = container.resolve('config');
        return createI18n(config.i18n);
      }
    }, { scope: 'singleton' });
  }
}
```

### Container Disposal & Rebuild

#### Restart Flow
```typescript
class Tego {
  async restart(options: RestartOptions = {}) {
    // 1. Trigger beforeStop event
    await this.eventBus.emit('beforeStop', this, options);
    
    // 2. Dispose container (automatically calls dispose hooks for all services)
    await this.container.dispose();
    
    // 3. Recreate container
    this.container = new Container();
    
    // 4. Re-register core services
    this.registerCoreServices();
    
    // 5. Reload plugins (plugins will re-register services)
    await this.reload(options);
    
    // 6. Restart
    await this.start(options);
    
    // 7. Trigger __restarted event
    this.eventBus.emit('__restarted', this, options);
  }
}
```

#### Service Cleanup
```typescript
// Automatically called when container is disposed
class Container implements IContainer {
  async dispose() {
    // Dispose services in reverse registration order
    for (const [token, registration] of this.registrations.reverse()) {
      if (registration.options?.dispose && registration.instance) {
        await registration.options.dispose(registration.instance);
      }
    }
    
    // Clear registry
    this.registrations.clear();
  }
}

// Example: Database service cleanup
container.register('database', {
  useFactory: async (container) => {
    const db = await createDatabase(config);
    return db;
  }
}, {
  scope: 'singleton',
  dispose: async (db) => {
    await db.close(); // Close database connection
  }
});
```

## Container Implementation Based on @tachybase/di

### Using Existing DI Package

Tego 2.0 will be based on the `@tego/di` package, which already supports **Stage 3 Decorators** (TypeScript 5.0+) and provides comprehensive dependency injection capabilities.

#### @tego/di Core Features

1. **Stage 3 Decorators Support**
   - Uses the latest ECMAScript decorator standard
   - No need for `experimentalDecorators` or `emitDecoratorMetadata`
   - Better type inference and performance

2. **Core Decorators**
   - `@Service()`: Mark class as injectable service
   - `@Inject()`: Inject dependency into property
   - `@InjectMany()`: Inject multiple services of the same type

3. **Container Features**
   - Support multiple container instances
   - Support scopes (singleton, container, transient)
   - Support factory functions
   - Support Token identifiers

### Container Wrapping & Enhancement

While using `@tego/di`, wrapping is needed to adapt to Tego's requirements:

```typescript
import { Container as DIContainer, Token, Service, Inject } from '@tego/di';

class TegoContainer {
  private diContainer: DIContainer;
  private disposeHooks: Map<any, () => Promise<void>> = new Map();
  
  constructor(id: string) {
    this.diContainer = new DIContainer(id);
  }
  
  // Register service (with dispose hook support)
  register<T>(
    token: string | Token<T> | { new(...args: any[]): T },
    provider: ServiceProvider<T>,
    options?: RegistrationOptions
  ): void {
    // Convert to @tego/di format
    const serviceMetadata = {
      id: token,
      type: provider.useClass,
      factory: provider.useFactory,
      value: provider.useValue,
      scope: options?.scope === 'singleton' ? 'singleton' : 'container',
      multiple: false,
    };
    
    this.diContainer.set(serviceMetadata);
    
    // Store dispose hook
    if (options?.dispose) {
      this.disposeHooks.set(token, async () => {
        const instance = this.diContainer.get(token);
        await options.dispose!(instance);
      });
    }
  }
  
  // Resolve service
  resolve<T>(token: string | Token<T> | { new(...args: any[]): T }): T {
    return this.diContainer.get(token);
  }
  
  // Check if service exists
  has<T>(token: string | Token<T> | { new(...args: any[]): T }): boolean {
    return this.diContainer.has(token);
  }
  
  // Dispose container
  async dispose(): Promise<void> {
    // Execute all dispose hooks
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
  
  // Get raw container (for advanced usage)
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

### Convenient Injection for Plugins

Provide decorators and helper methods for Plugin base class:

```typescript
import { Service, Inject } from '@tachybase/di';

// Define common service Tokens
export const TOKENS = {
  EventBus: new Token<IEventBus>('eventBus'),
  Logger: new Token<ILogger>('logger'),
  Config: new Token<IConfig>('config'),
  LifecycleManager: new Token<ILifecycleManager>('lifecycleManager'),
};

// Enhanced Plugin base class
class Plugin {
  // Inject via decorators
  @Inject(() => TOKENS.EventBus)
  protected eventBus!: IEventBus;
  
  @Inject(() => TOKENS.Logger)
  protected logger!: ILogger;
  
  // Get via method
  protected getService<T>(token: string | Token<T> | { new(...args: any[]): T }): T {
    return this.app.container.resolve(token);
  }
  
  // Convenient method to register service
  protected registerService<T>(
    token: string | Token<T> | { new(...args: any[]): T },
    provider: ServiceProvider<T>,
    options?: RegistrationOptions
  ): void {
    this.app.container.register(token, provider, options);
  }
}

// Plugin usage example
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
    // Method 1: Register class (auto-inject dependencies)
    this.registerService(MyService, { useClass: MyService });
    
    // Method 2: Register factory function
    this.registerService('myFactory', {
      useFactory: (container) => {
        const logger = container.resolve(TOKENS.Logger);
        return new MyFactoryService(logger);
      }
    });
    
    // Method 3: Register value
    this.registerService('myConfig', {
      useValue: { key: 'value' }
    });
  }
  
  async load() {
    // Use injected services
    this.eventBus.on('someEvent', async (data) => {
      this.logger.info('Event received', data);
    });
    
    // Or manually get
    const myService = this.getService(MyService);
    await myService.doSomething();
  }
}
```

## Event Bus Design

### Core Principles

1. **Eliminate AsyncEmitter Mixin**
   - No longer use `applyMixins(Application, [AsyncEmitter])`.
   - `Application` no longer extends `EventEmitter`.
   - All events handled through unified `EventBus` service.

2. **Container Injection**
   - `EventBus` registered as singleton service in container.
   - Components needing event capabilities resolve `EventBus` via container.

3. **Type Safety**
   - Support type definitions for event names and parameters.
   - Compile-time checking of event subscription and publication type matching.

4. **Unified Async API**
   - **Only keep `emitAsync` method**, remove `emit` sync method.
   - All event handlers are async, aligning with Node.js ecosystem habits.
   - Scenarios not needing to wait can simply not `await` the call result.

### EventBus Interface Design

```typescript
interface IEventBus {
  // Subscribe to event
  on<T = any>(event: string, handler: EventHandler<T>, options?: SubscribeOptions): Unsubscribe;
  
  // Subscribe to one-time event
  once<T = any>(event: string, handler: EventHandler<T>): Unsubscribe;
  
  // Unsubscribe
  off(event: string, handler: EventHandler): void;
  
  // Publish async event (unified API)
  emitAsync(event: string, ...args: any[]): Promise<void>;
  
  // Get event listener count
  listenerCount(event: string): number;
  
  // Clear all listeners
  removeAllListeners(event?: string): void;
}

type EventHandler<T = any> = (data: T, ...args: any[]) => void | Promise<void>;

type Unsubscribe = () => void;

interface SubscribeOptions {
  priority?: number; // Priority (higher number executes first)
  once?: boolean;    // Execute only once
}
```

### Type-Safe Event Definitions

```typescript
// Define event type mapping
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

// Type-safe EventBus
class TypedEventBus implements IEventBus {
  on<K extends keyof TegoEvents>(
    event: K,
    handler: (...args: TegoEvents[K]) => void | Promise<void>,
    options?: SubscribeOptions
  ): Unsubscribe {
    // Implementation
  }
  
  emitAsync<K extends keyof TegoEvents>(
    event: K,
    ...args: TegoEvents[K]
  ): Promise<void> {
    // Implementation
  }
}
```

### Event Bus Implementation Example

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
    
    // Return unsubscribe function
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
    
    // Sort by priority
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
        throw error; // Interrupt execution on async event error
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

### Migration Example

#### Before Migration (Using AsyncEmitter Mixin)
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

// Subscribe to events in plugin
class MyPlugin extends Plugin {
  async load() {
    this.app.on('beforeLoad', async (app, options) => {
      // Handle event
    });
  }
}
```

#### After Migration (Using EventBus)
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

// Subscribe to events in plugin
class MyPlugin extends Plugin {
  async load() {
    const eventBus = this.app.container.resolve<IEventBus>('eventBus');
    
    eventBus.on('beforeLoad', async (app, options) => {
      // Handle event
    });
  }
}
```

### Event Cleanup Mechanism

#### Auto-cleanup on Plugin Unload
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
    // Auto-unsubscribe all
    for (const unsubscribe of this.eventUnsubscribers) {
      unsubscribe();
    }
    this.eventUnsubscribers = [];
  }
}
```

#### Cleanup on Tego Restart
```typescript
class Tego {
  async restart(options: RestartOptions = {}) {
    // Clear all event listeners
    this.eventBus.removeAllListeners();
    
    // Dispose container
    await this.container.dispose();
    
    // Recreate
    this.container = new Container();
    this.eventBus = new EventBus();
    this.container.register('eventBus', { useValue: this.eventBus });
    
    // Reload
    await this.reload(options);
    await this.start(options);
  }
}
```

## Comparison with Existing Code

### Issues with Current Implementation

1. **EventEmitter Inheritance Pollution**
   - `Application` extends `EventEmitter`, adding many unnecessary methods to instances.
   - Difficult to control event lifecycle and cleanup.

2. **AsyncEmitter Mixin Complexity**
   - Using `applyMixins` increases code complexity.
   - Type inference not friendly, requires `declare emitAsync`.

3. **Difficult Event Cleanup**
   - `reInitEvents()` method relies on `_reinitializable` flag, not generic enough.
   - Event listeners may leak on restart.

4. **Lack of Type Safety**
   - Event names and parameter types cannot be checked at compile time.
   - Easy to have event name typos or parameter mismatches.

### Advantages of New Implementation

1. **Clear Responsibilities**
   - `Tego` no longer extends `EventEmitter`, only holds `EventBus` reference.
   - Event capabilities injected via container, easy to test and replace.

2. **Controllable Lifecycle**
   - Auto-cleanup of all services (including event listeners) on container disposal.
   - Auto-unsubscribe on plugin unload.

3. **Type Safety**
   - Define event types via `TegoEvents` interface.
   - Compile-time checking of event names and parameters.

4. **Better Extensibility**
   - Easy to replace `EventBus` implementation (e.g., using Redis Pub/Sub).
   - Support event priority, one-time subscription, and other advanced features.

## Migration Steps

### Phase 1: Define Interfaces (2.0 Alpha)
1. Define `IContainer` interface and implementation.
2. Define `IEventBus` interface and implementation.
3. Define `TegoEvents` type mapping.

### Phase 2: Core Refactoring (2.0 Alpha)
1. Create `Tego` class (renamed from `Application`).
2. Remove `EventEmitter` inheritance and `AsyncEmitter` mixin.
3. Create container and event bus in constructor.
4. Change all `this.emitAsync()` to `this.eventBus.emitAsync()`.
5. Change all `this.on()` to `this.eventBus.on()`.

### Phase 3: Plugin Adaptation (2.0 Beta)
1. Update `Plugin` base class to provide `subscribeEvent()` helper method.
2. Update all built-in plugins to resolve `EventBus` via container.
3. Provide migration guide and sample code.

### Phase 4: Cleanup & Optimization (2.0 GA)
1. Remove old event cleanup logic like `reInitEvents()`.
2. Remove `applyMixins` related code.
3. Optimize event bus performance (batch publishing, deferred execution, etc.).
4. Complete documentation and tests.

## Configuration Examples

### Tego Configuration
```typescript
const tego = new Tego({
  name: 'main',
  
  // Container configuration
  container: {
    enableValidation: true, // Enable dependency validation
    enableAutoDispose: true // Enable auto-cleanup
  },
  
  // Event bus configuration
  eventBus: {
    maxListeners: 100, // Max listener count
    errorHandler: (error, event) => {
      console.error(`Event error in "${event}":`, error);
    }
  },
  
  // Plugin configuration
  plugins: [
    '@tego/module-standard-core',
    '@tego/plugin-http-server',
    '@tego/plugin-websocket'
  ]
});
```

### Plugin Configuration
```typescript
class MyPlugin extends Plugin {
  async beforeLoad() {
    const container = this.app.container;
    
    // Register service
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
    // Subscribe to events
    this.subscribeEvent('beforeStart', async (tego, options) => {
      const myService = this.app.container.resolve('myService');
      await myService.initialize();
    });
  }
}
```

## Benefits Summary

1. **Clearer Architecture**
   - Container and event bus have clear responsibilities, easy to understand and maintain.
   - Remove mixin and inheritance, reduce code complexity.

2. **Better Testability**
   - Container and event bus can be easily mocked.
   - Plugin tests no longer depend on global state.

3. **Stronger Type Safety**
   - Event names and parameter types checked at compile time.
   - Reduce runtime errors.

4. **More Flexible Extension**
   - Can replace container and event bus implementations.
   - Support distributed events (via Redis Pub/Sub, etc.).

5. **Better Lifecycle Management**
   - Auto-cleanup of all services on container disposal.
   - Auto-unsubscribe events on plugin unload.

## Migration Checklist

- [ ] Define `IContainer` interface and implementation.
- [ ] Define `IEventBus` interface and implementation.
- [ ] Define `TegoEvents` type mapping.
- [ ] Create `Tego` class and remove `EventEmitter` inheritance.
- [ ] Refactor all `emitAsync()` calls.
- [ ] Refactor all `on()` / `once()` calls.
- [ ] Update `Plugin` base class to provide event subscription helper methods.
- [ ] Update all built-in plugins to use container and event bus.
- [ ] Write migration guide and sample code.
- [ ] Write unit tests and integration tests.
- [ ] Update documentation and API reference.
- [ ] Release 2.0 Alpha version and collect feedback.
- [ ] Optimize container and event bus API based on feedback.
- [ ] Complete all cleanup work before 2.0 GA.

