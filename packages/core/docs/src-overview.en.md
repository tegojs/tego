# TachyBase Core `src` Overview

## Directory at a Glance
- `application.ts`: Core entry point that orchestrates the application lifecycle, wiring database, cache, gateway, plugins, and system events.
- `app-command.ts` / `commands/`: CLI wrapper on top of `commander` plus concrete commands for install, migration, runtime management, and other operations.
- `app-supervisor.ts`: Supervisor that coordinates multiple application instances within the same process.
- `aes-encryptor.ts`: AES helper for encrypting and decrypting sensitive configuration.
- `environment.ts`: Centralised runtime environment reader and manager.
- `helper.ts` & `helpers/`: Utility helpers for bootstrap routines, resource registration, version management, and misc support logic.
- `main-data-source.ts` / `migration.ts` / `migrations/`: Main data source wiring, database migration entry points, and bundled migration scripts.
- `acl/`: Access-control setup plus declarations of available actions.
- `cache/`: Cache manager factory and related caching adapters.
- `cron/`: `CronJobManager` wrapper responsible for scheduling recurring jobs.
- `gateway/`: HTTP/WebSocket gateway and IPC transport that exposes real-time capabilities.
- `middlewares/`: Built-in Koa middlewares (data wrapping, variable parsing, internationalisation, etc.).
- `locale/`: Application-level internationalisation bootstrap and resource registration.
- `notice/`: Pushes status updates, toasts, modal messages, and custom events through the gateway.
- `plugin.ts` & `plugin-manager/`: Plugin base class, dependency resolution, lifecycle hooks, and static asset serving for the plugin ecosystem.
- `pub-sub-manager/`: Abstraction over in-memory and other pub/sub adapters for distributed signalling.
- `sync-message-manager.ts`: Dispatcher for synchronising messages across peer application instances.
- `errors/`: Core domain-specific error classes.
- `__tests__/`: Automated tests covering lifecycle, command handling, gateway behaviour, and more.

## `Application` Event Hooks
Events are emitted in `application.ts` via `emit` / `emitAsync` and are available for plugins or external modules to subscribe to:

- `maintaining`: Fired when maintenance command status changes; carries the active command context.
- `maintainingMessageChanged`: Fired when the maintenance progress message changes.
- `beforeLoad` / `afterLoad`: Emitted around the plugin loading phase inside `load()`.
- `beforeReload` / `afterReload`: Emitted before and after `reload()` completes.
- `beforeStart` / `afterStart`: Lifecycle hooks that bracket the startup routine.
- `__started`: Broadcast after `start()` completes, including the maintenance status and start options.
- `beforeStop` / `afterStop`: Hooks around `stop()`; also reused inside `restart()`.
- `beforeDestroy` / `afterDestroy`: Fired during teardown so resources can be released.
- `beforeInstall` / `afterInstall`: Wrap the installation flow that prepares the database and plugins.
- `afterUpgrade`: Notifies listeners after the upgrade pipeline finishes.
- `__restarted`: Fired once `restart()` completes to signal that the instance restarted successfully.

