# TachyBase Plugin Lifecycle

TachyBase Core plugins are orchestrated by `PluginManager`. The hooks defined in `Plugin` (`packages/core/src/plugin.ts`) are invoked at different stages inside `plugin-manager/plugin-manager.ts`. This document summarises the current behaviour.

## Registration Phase
- `pm.add()`: Instantiates the plugin then calls `plugin.afterAdd()`. The plugin already has access to `app`, `options`, and can register feature plugins via `addFeature()`.
- `afterAdd()` should remain side-effect free; avoid network I/O or schema changes here.

## Load Phase (inside `Application.load()`)
1. `plugin.beforeLoad()`: Runs before bulk loading; prepare state or validate dependencies here.
2. `beforeLoadPlugin` event: Emitted by the application so other plugins/modules can intervene.
3. `plugin.loadCollections()`: Auto-imports collection schemas if provided.
4. `plugin.load()`: Main runtime wiring—register services, actions, routes, etc.
5. `afterLoadPlugin` event: Signals that loading finished successfully.
6. Feature plugins follow the same `beforeLoad` → `load` sequence immediately after their parent.

When `load()` completes, the plugin is marked `state.loaded = true` to prevent duplicate work.

## Install Phase (`pm.install()` or during enable)
- Order: `beforeInstallPlugin` → `plugin.install()` → `afterInstallPlugin`.
- Use `install()` for one-off tasks such as seeding data or migrating existing configs.
- Feature plugins run their own `install()` after the primary plugin finishes.

## Enable / Disable
- Enable flow: `plugin.beforeEnable()` → persist `enabled` flag → `app.reload()` → `plugin.install()` if needed → `plugin.afterEnable()` → `afterEnablePlugin`.
- Disable flow: `plugin.beforeDisable()` → persist flag → `app.tryReloadOrRestart()` → `plugin.afterDisable()` → `afterDisablePlugin`.

If an error occurs, the manager rolls back persisted state and attempts to recover the app.

## Upgrade & Migrations
- `plugin.upgrade()` participates in the consolidated upgrade pipeline.
- `plugin.loadMigrations()` returns `{ beforeLoad, afterSync, afterLoad }`. Execution points:
  - `beforeLoad`: before the app enters the loading phase.
  - `afterSync`: immediately after `app.db.sync()`.
  - `afterLoad`: after all plugins finish loading.

## Additional Hooks
- Removal: `plugin.beforeRemove()` and `plugin.afterRemove()`.
- Sync messages: `plugin.handleSyncMessage()` to receive and `plugin.sendSyncMessage()` to publish via `SyncMessageManager`.

## Authoring Guidelines
- Keep one-time setup in `install()`, and idempotent runtime wiring in `load()`.
- Use `beforeLoad()` for lightweight readiness checks or dependency probing.
- `beforeEnable()` / `afterEnable()` and their disable counterparts are ideal for dynamic registrations such as gateways or cache refresh.
- Throwing inside any hook aborts the current stage; ensure errors are descriptive for easier troubleshooting.

