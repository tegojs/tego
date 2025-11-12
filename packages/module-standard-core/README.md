# @tego/module-standard-core

Core services plugin for Tego framework. This plugin provides all standard services that were previously built into the Application class, now available through dependency injection.

## Services Provided

- **Web/HTTP**: Koa server, Resourcer, ACL, AuthManager, Middlewares, Gateway, WebSocket
- **Data**: Database, DataSourceManager, CacheManager
- **Background**: CronJobManager, PubSubManager, SyncMessageManager, NoticeManager
- **Utilities**: AesEncryptor, ApplicationVersion, Winston Logger

## Usage

This plugin is automatically loaded by Tego and registers all services to the DI container using tokens from `@tego/server`.

```typescript
import { TOKENS } from '@tego/server';

class MyPlugin extends Plugin {
  load() {
    const db = this.getService(TOKENS.Database);
    const acl = this.getService(TOKENS.ACL);
  }
}
```

## Migration from Application

Previously, services were accessed directly from the Application instance:

```typescript
const db = this.app.db;
const acl = this.app.acl;
```

Now, services must be accessed through the DI container:

```typescript
const db = this.getService(TOKENS.Database);
const acl = this.getService(TOKENS.ACL);
```

