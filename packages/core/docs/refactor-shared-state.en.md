# TachyBase Core Refactor Notes: Database & State Management

This note captures the parts of `@tego/core` that touch the database, plugin management, and shared state so future refactors have a single reference point.

## Database Capabilities
- **Main data source** (`main-data-source.ts`): builds a `SequelizeDataSource`, wires ACL / Resourcer / Database, and creates a filtered collection manager.
- **Application lifecycle** (`application.ts`):
  - Auth & preparation: `db.auth()`, `db.checkVersion()`, `db.prepare()`
  - Sync & migrations: `db.sync()`, `loadCoreMigrations()` + `db.createMigrator()` for `{ beforeLoad, afterSync, afterLoad }`
  - Resource access: `db.collection()`, `db.getCollection()`, `collectionExistsInDb()`
  - Cleanup & restart: `db.clean({ drop: true })`, `db.close()`, `db.reconnect()`
- **Plugin manager** (`plugin-manager.ts`):
  - Uses the `applicationPlugins` collection (`options/collection.ts`) to persist name/version/enabled/installed/options/subView
  - `PluginManagerRepository` implements `find/update/destroy/save/init` on top of the database
  - Enable/disable/install flows call `app.db.sync()` and persist status updates
- **CLI commands** (`commands/*.ts`):
  - `db:sync`, `install`, `pm` and others call into `app.db` to sync schemas, load collections, or run migrations
- **Plugin helpers** (`plugin.ts`):
  - `loadCollections()` imports bundled collections
  - `sendSyncMessage()` publishes after transaction commit, relying on `Transactionable`

## Making Plugin Management Memory-Backed
1. **Abstract the registry**: define a `PluginRegistry` interface (`list/add/update/remove/get`) so database, memory, or file-system drivers can be swapped in.
2. **Dual-write pattern**: on startup, hydrate an in-memory map from the persistent driver; on state changes, update memory first, then `flush()` asynchronously. Keep `PluginManagerRepository.init()` behaviour intact.
3. **Broadcast changes**: reuse `SyncMessageManager` or emit a new `plugin-state-changed` event for other processes.
4. **CLI & API compatibility**: have `pm.add/enable/disable/install()` operate on the registry abstraction instead of raw repositories.
5. **Migration pathway**: ship both memory and database drivers, feature-flag the new path, and once verified remove direct repository dependencies.

## State That May Need Cross-Process Coordination
- **Plugin registry**: `PluginManager.pluginInstances/aliases` and `applicationPlugins` records drive plugin lifecycle.
- **App supervisor**: `AppSupervisor.apps/appStatus/appErrors/lastMaintainingMessage` for instance bootstrapping and health.
- **Plugin instance state**: `plugin.state.loaded/installed/installing` to guard hook execution.
- **Maintaining status**: `Application._maintainingCommandStatus` & `_maintainingMessage`, consumed by the supervisor.
- **Cron scheduling**: `CronJobManager.jobs` and `_started` to avoid duplicate jobs.
- **Pub/Sub subscriptions**: `PubSubManager.handlerManager` plus `SyncMessageManager` channel bindings.
- **Cache context**: `CacheManager` and the default cache instance, if relying on process-local memory.
- **Gateway/Notice connections**: HTTP/WS sockets maintained per process; share only if required by business logic.
- **Application internals**: `Application.plugins` map, DI `container`, middleware DAG, `modules` registry—normally process-local, but initialisation must remain deterministic across workers.

## Example Strategies for State Sharing
| Strategy | Description | Typical Use | Caveats |
| --- | --- | --- | --- |
| **Redis / external store** | Read/write through Redis, etcd, or database | Active-active deployments | Requires distributed locks, retry logic, and eviction awareness |
| **Process-local** | Each worker loads a snapshot at boot and mutates privately | Single-node or read-heavy workloads | Needs broadcast/refresh, tolerates temporary divergence |
| **Single-writer / multi-reader** | One “leader” writes; followers consume read-only snapshots via IPC/PubSub | Plugin registry, schedulers, or other strongly-consistent workloads | Needs leader election / failover and clear recovery plan |

> Recommendation: start with single-writer for plugin management and cron scheduling; upgrade to Redis-backed sharing if horizontal scaling demands it. Ephemeral info (maintaining status, gateway connections) can stay process-local unless dashboards require global visibility.

## Refactor Checklist
1. Introduce state abstractions (`PluginRegistry`, `MaintainingStateStore`, `SchedulerStore`).
2. Register logger/cache/pubsub adapters via the DI container so the core depends only on interfaces.
3. Emit cross-process events when plugin or scheduler state changes; integrate with `SyncMessageManager`.
4. Add regression tests covering plugin enable/disable, CLI commands, and cluster-mode synchronisation.

