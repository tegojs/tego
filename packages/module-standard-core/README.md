# @tego/module-standard-core

Standard Core Plugin for Tego 2.0

## Overview

This plugin provides all the standard services that were previously built into `@tego/core` but are now provided as a plugin. This allows for a truly minimal core while maintaining all the functionality users expect.

## Services Provided

### Database & Data Management
- **DatabaseService**: Database connection and management
- **DataSourceService**: Multi-datasource support
- **ResourcerService**: RESTful resource management
- **ACLService**: Access Control List

### Authentication & Authorization
- **AuthService**: Authentication management
- User authentication
- Token management
- Session handling

### Caching
- **CacheService**: Cache management
- Redis support
- In-memory caching
- Cache strategies

### Internationalization
- **I18nService**: Internationalization
- **LocaleService**: Locale management
- Translation management
- Multi-language support

### Background Jobs
- **CronJobService**: Scheduled task management
- Cron expression support
- Job queuing
- Job monitoring

### Messaging
- **PubSubService**: Publish/Subscribe messaging
- **SyncMessageService**: Synchronous messaging
- **NoticeService**: Notification management
- Event-driven architecture

### Security
- **AesEncryptorService**: AES encryption/decryption
- Data encryption
- Secure storage

### Web Server
- **KoaService**: Koa web server
- **MiddlewareService**: Middleware management
- HTTP request handling
- WebSocket support

## Installation

```bash
pnpm add @tego/module-standard-core
```

## Usage

### Basic Setup

```typescript
import { Tego } from '@tego/core';
import StandardCorePlugin from '@tego/module-standard-core';

const tego = new Tego({
  plugins: [
    StandardCorePlugin,
  ],
});

await tego.load();
await tego.start();
```

### Accessing Services

Services are registered in the DI container and can be accessed via:

```typescript
import { TOKENS } from '@tego/core';

// Get database service
const db = tego.container.get(TOKENS.Database);

// Get resourcer service
const resourcer = tego.container.get(TOKENS.Resourcer);

// Get ACL service
const acl = tego.container.get(TOKENS.ACL);
```

### In Plugins

```typescript
import { Plugin } from '@tego/core';
import { TOKENS } from '@tego/core';

export class MyPlugin extends Plugin {
  async load() {
    // Access services from DI container
    const db = this.tego.container.get(TOKENS.Database);
    const resourcer = this.tego.container.get(TOKENS.Resourcer);
    
    // Use services
    db.collection({
      name: 'my_collection',
      fields: [
        { name: 'name', type: 'string' },
      ],
    });
  }
}
```

## Configuration

### Database

```typescript
const tego = new Tego({
  database: {
    dialect: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'user',
    password: 'password',
    database: 'mydb',
  },
  plugins: [StandardCorePlugin],
});
```

### Cache

```typescript
const tego = new Tego({
  cacheManager: {
    store: 'redis',
    host: 'localhost',
    port: 6379,
  },
  plugins: [StandardCorePlugin],
});
```

### Authentication

```typescript
const tego = new Tego({
  authManager: {
    authKey: 'X-Authenticator',
    default: 'basic',
  },
  plugins: [StandardCorePlugin],
});
```

## Service Lifecycle

All services follow the plugin lifecycle:

1. **beforeLoad**: Service registration
2. **load**: Service initialization
3. **afterLoad**: Service configuration
4. **beforeStart**: Service startup
5. **afterStart**: Service ready
6. **beforeStop**: Service shutdown
7. **afterStop**: Service cleanup

## Events

The plugin emits various events:

- `plugin:standard-core:beforeLoad`
- `plugin:standard-core:afterLoad`
- `plugin:standard-core:beforeStart`
- `plugin:standard-core:afterStart`

## Migration from Tego 1.x

### Before (Tego 1.x)

```typescript
const app = new Application({
  database: { /* config */ },
});

// Services available directly
app.db.collection({ /* ... */ });
app.resourcer.define({ /* ... */ });
app.acl.allow({ /* ... */ });
```

### After (Tego 2.0)

```typescript
import { Tego } from '@tego/core';
import { TOKENS } from '@tego/core';
import StandardCorePlugin from '@tego/module-standard-core';

const tego = new Tego({
  database: { /* config */ },
  plugins: [StandardCorePlugin],
});

// Services available via DI container
const db = tego.container.get(TOKENS.Database);
const resourcer = tego.container.get(TOKENS.Resourcer);
const acl = tego.container.get(TOKENS.ACL);

db.collection({ /* ... */ });
resourcer.define({ /* ... */ });
acl.allow({ /* ... */ });
```

## Architecture

```
┌─────────────────────────────────────┐
│         @tego/core                  │
│  - Plugin System                    │
│  - EventBus                         │
│  - DI Container                     │
│  - CLI                              │
│  - Lifecycle                        │
└─────────────────────────────────────┘
              ▲
              │
┌─────────────────────────────────────┐
│   @tego/module-standard-core        │
│  - Database                         │
│  - Resourcer                        │
│  - ACL                              │
│  - Auth                             │
│  - Cache                            │
│  - I18n                             │
│  - CronJob                          │
│  - PubSub                           │
│  - Koa Server                       │
│  - ... all standard services        │
└─────────────────────────────────────┘
```

## Development

### Building

```bash
pnpm build
```

### Testing

```bash
pnpm test
```

### Linting

```bash
pnpm lint
```

## License

Apache-2.0

## Links

- [Tego Documentation](https://docs.tachybase.com)
- [GitHub Repository](https://github.com/tachybase/tachybase)
- [Issue Tracker](https://github.com/tachybase/tachybase/issues)
