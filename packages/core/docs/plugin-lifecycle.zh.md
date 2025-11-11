# TachyBase 插件生命周期说明

TachyBase Core 插件通过 `PluginManager` 统一管理，生命周期钩子由 `Plugin` 基类定义并在不同阶段被调用。本文档基于 `packages/core/src/plugin.ts` 与 `plugin-manager/plugin-manager.ts` 的实现整理。

## 插件注册阶段
- `pm.add()`：实例化插件并调用 `plugin.afterAdd()`，此时插件已拥有 `app`、`options` 等上下文。
- 插件可在 `afterAdd` 中注册特性（`addFeature()`）或预先写入状态，但此阶段不会触发数据库或 I/O 操作。

## 加载阶段（`Application.load()` 内执行）
1. `plugin.beforeLoad()`：在批量加载前执行，适合准备内部状态或校验依赖。
2. `beforeLoadPlugin` 事件：应用层广播，可供其他插件/模块拦截。
3. `plugin.loadCollections()`：自动导入插件内定义的集合（若存在）。
4. `plugin.load()`：插件主体逻辑，建议在此注册路由、服务、命令等。
5. `afterLoadPlugin` 事件：通知加载完成。
6. 特性（Features）在主插件之后执行同样的 `beforeLoad` → `load` 流程。

插件成功执行 `load()` 后会被标记为 `state.loaded = true`，避免重复加载。

## 安装阶段 (`pm.install()` / 启用流程触发)
- 事件顺序：`beforeInstallPlugin` → `plugin.install()` → `afterInstallPlugin`。
- 插件应在 `install()` 中执行一次性的初始化逻辑，例如写入默认数据、迁移旧版本配置。
- 特性实例会在主插件完成后依次执行 `install()`。

## 启用 / 停用
- 启用：`plugin.beforeEnable()` → 持久化 `enabled` 状态 → 触发 `pm.reload()` → `plugin.install()`（若未安装） → `plugin.afterEnable()` → `afterEnablePlugin`。
- 停用：`plugin.beforeDisable()` → 更新状态 → `pm.tryReloadOrRestart()` → `plugin.afterDisable()` → `afterDisablePlugin`。

若启用 / 停用过程中出现异常，管理器会回滚状态并尝试恢复应用。

## 升级及迁移
- `plugin.upgrade()`：插件在升级管线中被调用，多与迁移脚本配合执行。
- 通过 `plugin.loadMigrations()` 返回 `{ beforeLoad, afterSync, afterLoad }` 三阶段迁移，具体触发点：
  - `beforeLoad`：应用加载前执行。
  - `afterSync`：数据库 `sync()` 之后执行。
  - `afterLoad`：插件全部加载完成后执行。

## 其他钩子
- 移除：`plugin.beforeRemove()` / `plugin.afterRemove()`。
- 同步消息：`plugin.handleSyncMessage()`（接收），`plugin.sendSyncMessage()`（发送）。

## 插件编写建议
- 将一次性的初始化逻辑放在 `install()`，将幂等的运行期逻辑放在 `load()`。
- 避免在 `afterAdd()` 执行耗时操作；此阶段应保持无副作用。
- 使用 `beforeEnable()` / `afterEnable()` 处理启用时的动态配置，例如注册网关、刷新缓存等。
- 若插件依赖外部服务，推荐在 `beforeLoad()` 中探测依赖可用性，并在失败时抛出异常阻断加载。

