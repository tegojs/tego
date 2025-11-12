# Phase 5 Implementation Notes

## Current Status (Tego 2.0)

### Completed

1. ✅ **DI Container Integration**
   - Added `container` property to Tego class
   - Container initialized in constructor
   - Core services automatically registered

2. ✅ **Service Registration**
   - `registerCoreServices()` - Register core services (Tego, EventBus, Config)
   - `registerInitializedServices()` - Register initialized services

3. ✅ **module-standard-core Plugin**
   - Created plugin structure
   - Added service verification logic
   - Serves as placeholder for future service migration

### Service Access Patterns

#### Pattern 1: Direct Property Access (Current, Backward Compatible)
```typescript
const db = tego.db;
const acl = tego.acl;
const i18n = tego.i18n;
```

#### Pattern 2: DI Container Access (Recommended, Tego 2.0+)
```typescript
const { TOKENS } = require('@tego/core');
const db = tego.container.get(TOKENS.Database);
const acl = tego.container.get(TOKENS.ACL);
const i18n = tego.container.get(TOKENS.I18n);
```

### Registered Services

#### Core Services (Kept in core)
- `TOKENS.Tego` - Tego instance
- `TOKENS.EventBus` - Event bus
- `TOKENS.Logger` - Logger service
- `TOKENS.Config` - Configuration
- `TOKENS.Environment` - Environment
- `TOKENS.PluginManager` - Plugin manager
- `TOKENS.Command` - CLI

#### Standard Services (To be moved to plugin)
- `TOKENS.DataSourceManager` - Data source manager
- `TOKENS.CronJobManager` - Cron job manager
- `TOKENS.I18n` - Internationalization
- `TOKENS.AuthManager` - Authentication manager
- `TOKENS.PubSubManager` - Pub/sub manager
- `TOKENS.SyncMessageManager` - Sync message manager
- `TOKENS.NoticeManager` - Notice manager
- `TOKENS.AesEncryptor` - AES encryptor
- `TOKENS.CacheManager` - Cache manager

## Architecture Decisions

### Why Not Remove Service Properties Immediately?

1. **Backward Compatibility**: Existing plugins and apps depend on these properties
2. **Gradual Migration**: Allows step-by-step migration to DI container
3. **Stability**: Reduces risk of breaking changes
4. **Testing Time**: Need adequate time to test DI container implementation

### Why Services Still Initialize in Core?

1. **Complex Dependencies**: Services have complex interdependencies
2. **Initialization Order**: Need precise control over initialization sequence
3. **Circular Dependencies**: Some services have circular dependencies
4. **Test Coverage**: Need to ensure all scenarios are tested

## Migration Path

### Tego 2.0 (Current)
- ✅ DI container available
- ✅ Services registered in container
- ✅ Direct property access retained
- ✅ DI container usage recommended
- ⚠️ Property access marked @deprecated

### Tego 2.x (Transition Period)
- Gradually move service initialization to module-standard-core
- Keep getters as compatibility layer
- Getters internally use DI container
- Provide migration tools and documentation

### Tego 3.0 (Future)
- Completely remove service properties
- Enforce DI container usage
- Services fully provided by plugins
- Core keeps only minimal functionality

## Plugin Developer Guide

### Recommended Practice

```typescript
import { Plugin } from '@tego/core';
import { TOKENS } from '@tego/server';

export class MyPlugin extends Plugin {
  async load() {
    // Recommended: Use DI container
    const db = this.tego.container.get(TOKENS.Database);
    const acl = this.tego.container.get(TOKENS.ACL);
    
    // Also works: Direct access (will be deprecated)
    const i18n = this.tego.i18n;
  }
}
```

### Register Custom Services

```typescript
export class MyPlugin extends Plugin {
  async beforeLoad() {
    // Register custom service
    this.tego.container.set('myService', new MyService());
  }
  
  async load() {
    // Use custom service
    const myService = this.tego.container.get('myService');
  }
}
```

## Technical Details

### DI Container Implementation

- Uses `@tego/di` package
- Based on Stage 3 Decorators
- Supports singleton, transient, scoped
- Supports factory functions
- Supports dispose hooks

### Container Lifecycle

1. **Creation**: Created in Tego constructor
2. **Registration**: Two-phase registration
   - Constructor: Tego, EventBus, Config
   - After init(): All other services
3. **Usage**: Access via `container.get()`
4. **Disposal**: Destroyed when Tego is destroyed

### Service Resolution

```typescript
// Direct get
const service = container.get(TOKENS.ServiceName);

// Check existence
if (container.has(TOKENS.ServiceName)) {
  const service = container.get(TOKENS.ServiceName);
}

// Set service
container.set(TOKENS.ServiceName, serviceInstance);
```

## Known Issues

### 1. Type Inference

Currently `container.get()` returns `any`, requires manual type assertion:

```typescript
const db = container.get(TOKENS.Database) as Database;
```

**Solution**: TOKENS definition includes type information.

### 2. Circular Dependencies

Some services may have circular dependencies.

**Solution**: Use lazy injection or refactor service dependencies.

### 3. Initialization Order

Service initialization order matters.

**Solution**: Explicit order in `registerInitializedServices()`.

## Testing Recommendations

### Unit Tests

```typescript
import { Container } from '@tego/di';
import { TOKENS } from '@tego/core';

describe('Service Registration', () => {
  it('should register all core services', () => {
    const container = Container.of('test');
    // ... test service registration
  });
});
```

### Integration Tests

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

## Performance Considerations

1. **Container Overhead**: DI container resolution has slight overhead
2. **Singleton Caching**: Singleton services created only once
3. **Lazy Loading**: Services created on demand
4. **Memory Usage**: Container maintains service references

## Next Steps

1. **Monitor Usage**: Collect DI container usage data
2. **Gather Feedback**: Collect feedback from plugin developers
3. **Improve Documentation**: Enhance migration guide and best practices
4. **Plan Migration**: Schedule service migration to plugin timeline
5. **Tooling Support**: Develop migration tools and code generators

## References

- [Phase 5 Migration Plan](./phase5-service-migration.en.md)
- [DI Container Design](./di-container-eventbus-plan.zh.md)
- [@tego/di Documentation](../../di/README.md)
- [Plugin Development Guide](./plugin-lifecycle.zh.md)

