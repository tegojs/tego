# TachyBase Core 2.0 Roadmap: A DI-Centric Runtime

> This document captures the 2.0 refactor direction: move almost every service into the dependency injection (DI) container or dedicated plugins, while the core keeps only the lean runtime skeleton. The change is **intentionally breaking**, aimed at a cleaner architecture that works for both single-node and cluster deployments. Migration notes are provided, but full backward compatibility is *not* required.

## Scope & Guardrails

- **Core keeps only**:
  - Plugin loading & lifecycle orchestration
  - Event system (sync & async)
  - DI container (registration, resolution, scoping)
  - Configuration parsing & merging
  - Application lifecycle (load/start/stop/restart/destroy)
  - CLI framework
  - Environment & runtime metadata
- **All services move into container-registered modules**:
  - Database, ORM, migrations
  - ACL, auth, cache, internationalisation
  - HTTP/WS gateway, notifications, schedulers
  - Logging, tracing, metrics, pub/sub
  - Plugin registry persistence, sync messaging, versioning

## Key Workstreams

### 1. Dependency Injection Container
- Provide a uniform `Container` API with token registration, scopes, lazy resolution.
- Core registers only essentials: config provider, event bus, lifecycle coordinator, default logger.
- Plugins extend the container in `beforeLoad` / `load` hooks and clean up during `beforeDisable` / `afterDisable`.
- Support container snapshots / rollback to aid hot reload & plugin removal.

### 2. Plugin System
- Plugin manifest gains container metadata so “bootstrap” plugins can register critical services first.
- Lifecycle works hand-in-hand with the container: register services → consume services → dispose services.
- Plugin state stored via a `PluginRegistry` abstraction that supports in-memory or persistent drivers.

### 3. Events & Lifecycle
- Keep `emit` / `emitAsync` in the core and document standard event names for cross-plugin interoperability.
- Introduce container-aware lifecycle hooks (e.g. `beforeContainerInit`) if needed.
- In cluster mode, rely on container-provided pub/sub or IPC adapters for broadcasting events.

### 4. CLI & Configuration
- CLI commands resolve dependencies from the container (logger, registry, lifecycle manager).
- Normalise configuration sources via a `ConfigurationProvider` (files, env vars, remote stores, etc.).
- Core ingests configuration, stores it in the container, plugins enrich or consume the config at load time.

### 5. Environment & Instance Management
- Expose environment info (runtime mode, cluster role, instance ID) via container tokens.
- Keep `AppSupervisor` as a container-registered singleton to manage multiple app instances.
- Provide cluster coordination services (locks, leader election, broadcast) through container adapters.

## Migration Playbook

1. **Define interfaces**: extract DI-friendly contracts (`Logger`, `CacheProvider`, `Scheduler`, …) for existing services.
2. **Pluginise implementations**: move database, gateway, ACL, etc. into plugins that register these contracts.
3. **Rewrite bootstrap**:
   - Application init → container creation → core registrations → plugin registration/load → CLI & events binding.
   - Strip `Application.init()` of direct `new` calls.
4. **State management**: follow `refactor-shared-state.*.md` for single-writer / Redis / in-process strategies; implement adapters in container.
5. **Breaking change checklist**: mark public APIs, config formats, plugin hooks that change; provide migration hints.
6. **Testing**: create minimal core + plugin combinations, add cluster-mode regression tests.

## Cluster Compatibility

- Container services can declare deployment modes (singleton / per-process / distributed). Resolution honours the current topology.
- Plugins choose between shared stores (Redis, DB, message bus) or local state depending on strategy.
- CLI writes run on the leader process; changes propagate via container-managed event bus.
- For schedulers and plugin registry, default to “single writer / multi reader” with the option to swap in fully shared backends.

## Naming & Module Split Plan

- **Rename the core class**:
  - Rename `Application` (and `application.ts`) to `Tego`, updating all imports, event names, log prefixes, context fields, and configuration keys.
  - Align CLI output and error messages with the new name to avoid legacy references.
- **Slim down the implementation**:
  - Before renaming, move auxiliary helpers out of the current class into container-owned services or plugins.
  - Drop deprecated CLI handlers and legacy APIs so `Tego` exposes only the minimal contract.
- **Package the legacy behaviour as a plugin**:
  - Create a `module-standard-core` plugin that re-bundles database, ACL, cache, gateway, cron, i18n, pub/sub, etc.
  - The plugin registers services during `beforeLoad`, provides default configuration, and makes the legacy experience opt-in.
  - Allow teams to replace or pare down individual capabilities inside the plugin without touching the core runtime.

## Expected Benefits

- A lighter core enables faster customisation: different SKUs can compose features via plugins.
- Cloud-native friendliness: container adapters can target managed services without touching the core.
- Easier cluster scaling: flip adapters to distributed implementations to scale horizontally.
- Better testability: each interface is mockable; plugins can be tested in isolation.

## Breaking Change Highlights

- Direct property access (`app.db`, `app.logger`, `app.cache`, …) must be replaced with container resolution.
- Plugin manifest & config schemas will change—migration scripts or scaffolds are required.
- CLI commands and flags may shift; automation scripts must be updated.
- Third-party plugins need a v2-compatible release or a shim layer.

> **Next steps**: maintain migration guides, sample plugins, and container registration recipes under `docs/`. When releasing 2.x beta, ship developer onboarding materials and validation matrices alongside the refactored runtime.

