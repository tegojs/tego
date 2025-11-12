# Phase 5: Service Migration Plan

## Overview

Migrate most services from Tego core to the `@tego/module-standard-core` plugin, keeping the core minimal with only irreplaceable core functionality.

## Service Classification

### Services to Keep in Core

These services are fundamental to Tego's core architecture and cannot be replaced:

1. **EventBus** - Event bus (already implemented)
2. **PluginManager (pm)** - Plugin manager
3. **CLI (cli)** - Command line interface
4. **Environment (environment)** - Environment management
5. **Version (version)** - Version management
6. **Logger (_logger)** - Basic logger (ConsoleLogger)

### Services to Migrate to module-standard-core

These services can be provided by plugins and should be removed from core:

1. **Database (db)** - Database
2. **DataSourceManager (dataSourceManager)** - Data source manager
3. **Resourcer (resourcer)** - Resource manager
4. **ACL (acl)** - Access control
5. **AuthManager (authManager)** - Authentication manager
6. **CacheManager (cacheManager)** - Cache manager
7. **Cache (cache)** - Cache instance
8. **I18n (i18n)** - Internationalization
9. **LocaleManager (localeManager/locales)** - Locale manager
10. **CronJobManager (cronJobManager)** - Cron job manager
11. **PubSubManager (pubSubManager)** - Pub/sub manager
12. **SyncMessageManager (syncMessageManager)** - Sync message manager
13. **NoticeManager (noticeManager)** - Notice manager
14. **AesEncryptor (aesEncryptor)** - AES encryptor

### Services Requiring Special Handling

1. **Koa (_koa, context)** - Move to Gateway plugin
2. **AppSupervisor (_appSupervisor)** - Will be removed
3. **Gateway** - Move to separate plugin

## Migration Strategy

### Step 1: Add DI Container to Tego

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

### Step 2: Update Service Access Pattern

Change from direct property access to DI container:

#### Before (kept for backward compatibility):
```typescript
tego.db
tego.resourcer
tego.acl
tego.authManager
tego.cacheManager
tego.i18n
```

#### After (new way):
```typescript
tego.container.get(TOKENS.Database)
tego.container.get(TOKENS.Resourcer)
tego.container.get(TOKENS.ACL)
tego.container.get(TOKENS.AuthManager)
tego.container.get(TOKENS.CacheManager)
tego.container.get(TOKENS.I18n)
```

#### Compatibility Layer (transition period):
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
  
  // ... other service getters
}
```

### Step 3: Register Services in module-standard-core Plugin

```typescript
// packages/module-standard-core/src/server/plugin.ts
import { Plugin } from '@tego/core';
import { TOKENS } from '@tego/server';

export class StandardCorePlugin extends Plugin {
  getName(): string {
    return 'module-standard-core';
  }

  async beforeLoad() {
    // Register services to DI container
    this.registerServices();
  }

  private registerServices() {
    const { container } = this.tego;
    
    // Register DataSourceManager
    container.set(TOKENS.DataSourceManager, new DataSourceManager(this.tego));
    
    // Register CacheManager
    container.set(TOKENS.CacheManager, new CacheManager(this.tego.options.cacheManager));
    
    // Register AuthManager
    container.set(TOKENS.AuthManager, new AuthManager(this.tego.options.authManager));
    
    // Register I18n
    container.set(TOKENS.I18n, this.createI18n());
    
    // Register CronJobManager
    container.set(TOKENS.CronJobManager, new CronJobManager(this.tego));
    
    // Register PubSubManager
    container.set(TOKENS.PubSubManager, new PubSubManager(this.tego.options.pubSubManager));
    
    // Register SyncMessageManager
    container.set(TOKENS.SyncMessageManager, new SyncMessageManager());
    
    // Register NoticeManager
    container.set(TOKENS.NoticeManager, new NoticeManager(this.tego));
    
    // Register AesEncryptor
    container.set(TOKENS.AesEncryptor, new AesEncryptor());
  }
  
  async load() {
    // Initialize services
    await this.initializeServices();
  }
  
  private async initializeServices() {
    const { container } = this.tego;
    
    // Initialize DataSourceManager
    const dataSourceManager = container.get(TOKENS.DataSourceManager);
    await dataSourceManager.load();
    
    // Initialize CacheManager
    const cacheManager = container.get(TOKENS.CacheManager);
    await cacheManager.load();
    
    // Other service initialization...
  }
}
```

### Step 4: Remove Service Initialization from Tego

Remove the following:
- Private property declarations for services (e.g., `_db`, `_resourcer`)
- Service initialization code (in `init()` method)
- Service getters (keep @deprecated versions for transition)

### Step 5: Update Plugin Service Access

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

## Implementation Order

1. ✅ **Phase 4 Complete**: EventBus integration
2. **Phase 5.1**: Add DI container to Tego
3. **Phase 5.2**: Register core services to container
4. **Phase 5.3**: Implement module-standard-core plugin
5. **Phase 5.4**: Add compatibility layer getters
6. **Phase 5.5**: Remove service initialization code
7. **Phase 5.6**: Update documentation and migration guide

## Backward Compatibility

### Transition Period (Tego 2.0 - 2.x)
- Keep all getter methods, mark as @deprecated
- Getters internally use DI container
- Plugins can continue using `tego.db` etc.

### Future Version (Tego 3.0)
- Remove deprecated getters
- Enforce DI container usage for services

## Benefits

1. **Minimal Core**: Tego core only keeps essential functionality
2. **Plugin-based**: All business services provided by plugins
3. **Replaceable**: Services can be replaced with other implementations
4. **Testable**: Easier to mock and test
5. **Decoupled**: Services decoupled through DI container
6. **Flexible**: Users can choose not to load certain services

## Risks and Challenges

1. **Circular Dependencies**: Services may have circular dependencies
   - Solution: Use lazy injection
   
2. **Initialization Order**: Service initialization order matters
   - Solution: Explicitly define initialization order in module-standard-core
   
3. **Performance**: DI container may introduce overhead
   - Solution: Use singleton pattern, avoid repeated creation
   
4. **Migration Cost**: Existing plugins need updates
   - Solution: Provide compatibility layer and detailed migration guide

## Testing Plan

1. **Unit Tests**: Test DI container registration and resolution
2. **Integration Tests**: Test module-standard-core service registration
3. **Compatibility Tests**: Test deprecated getter backward compatibility
4. **Performance Tests**: Test DI container performance impact

## Documentation Updates

1. **API Documentation**: Update service access patterns
2. **Migration Guide**: Provide migration steps from old to new way
3. **Best Practices**: Recommend DI container best practices
4. **Example Code**: Provide examples using DI container

