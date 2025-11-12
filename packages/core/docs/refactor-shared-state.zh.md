# TachyBase Core 重构参考：数据库与状态管理

本文档整理了 `@tego/core` 当前与数据库、插件管理以及状态共享相关的关键逻辑，供后续重构评估与实施时参考。

## 数据库相关能力
- **主数据源初始化**：`main-data-source.ts` 基于 `SequelizeDataSource` 创建集合管理器，并注入 ACL、Resourcer、Database。
- **应用生命周期**（`application.ts`）：
  - 鉴权与准备：`db.auth()`, `db.checkVersion()`, `db.prepare()`
  - 同步与迁移：`db.sync()`, `loadCoreMigrations()` / `db.createMigrator()` 执行 `{ beforeLoad, afterSync, afterLoad }` 脚本
  - 资源访问：`db.collection()`, `db.getCollection()`, `collectionExistsInDb()`
  - 清理与重启：`db.clean({ drop: true })`, `db.close()`, `db.reconnect()`
- **插件管理**（`plugin-manager.ts`）：
  - `applicationPlugins` 集合（`options/collection.ts`）存储插件元数据（名称、版本、enabled、installed 等）
  - `PluginManagerRepository` 基于数据库驱动 `find/update/destroy/save/init`
  - 启用/禁用/安装流程多次调用 `app.db.sync()` 并持久化状态
- **命令行工具**（`commands/*.ts`）：
  - `db:sync`, `install`, `pm` 等命令直接使用 `app.db` 操作数据库、加载集合、触发迁移
- **插件实现**（`plugin.ts`）：
  - `loadCollections()` 自动导入插件自带集合
  - `sendSyncMessage()` 可在事务提交后触发消息广播，需要 `Transactionable`

## 插件管理内存化的可行性
1. **抽象注册表接口**：以 `PluginRegistry` 描述 `list/add/update/remove/get`，允许使用数据库、内存或文件系统作为具体驱动。
2. **双写策略**：启动时从持久化驱动加载到内存 Map；变更时先更新内存再异步 flush，兼容现有 `PluginManagerRepository.init()` 行为。
3. **事件通知**：通过现有 `SyncMessageManager` 或新的 `plugin-state-changed` 事件在多进程间广播变更。
4. **兼容 CLI 与 API**：`pm.add/enable/disable/install()` 改为基于注册表接口，不直接依赖数据库语句。
5. **渐进迁移**：先实现内存驱动与数据库驱动并行（配置切换），验证后再逐步移除硬编码的 `Repository` 依赖。

## 可能需要跨进程共享的状态
- **插件注册表**：`PluginManager.pluginInstances/aliases` 与 `applicationPlugins` 数据，决定插件启停及生命周期。
- **应用监督器**：`AppSupervisor.apps/appStatus/appErrors/lastMaintainingMessage` 等，用于多实例调度与监控。
- **插件实例状态**：`plugin.state` 中的 `loaded/installed/installing` 标记，影响钩子执行与幂等性。
- **维护与命令状态**：`Application._maintainingCommandStatus`, `_maintainingMessage`（被 `AppSupervisor` 消费）。
- **Cron 定时任务**：`CronJobManager.jobs` 集合，决定任务调度是否多进程重复执行。
- **Pub/Sub 订阅表**：`PubSubManager.handlerManager` 与 `SyncMessageManager` 订阅的频道。
- **缓存上下文**：`CacheManager` 和默认 `cache` 实例，如果依赖进程内内存，需要明确一致性策略。
- **网关连接**：`Gateway` / `NoticeManager` 持有的 HTTP/WS 连接，可按进程独立维护。
- **应用模块注册**：`Application.plugins` Map、`container`、`middleware` 拓扑、`modules` 字典，通常仅需进程内保存，但在热重载/集群启动时需同步初始化逻辑。

## 状态共享策略示例
| 策略 | 说明 | 适用场景 | 注意点 |
| --- | --- | --- | --- |
| **Redis / 外部存储共享** | 所有读写均走外部 store（Redis、etcd、数据库） | 多活部署、容忍网络延迟 | 需处理分布式锁、重试、数据过期 |
| **进程内独立** | 每个 worker 从持久化源加载一份，运行期独立维护 | 单机部署、读多写少 | 需要额外机制广播刷新，可能出现短暂不一致 |
| **单写多读** | 指定主进程写入，变更通过 IPC / PubSub 通知其他进程刷新只读副本 | 插件管理、Cron 调度等对一致性要求高但易集中写入的场景 | 要保证主进程故障时的主备切换与回退逻辑 |

> 建议：插件管理与任务调度优先采用“单写多读”策略；若未来需要横向扩展，可升级到 Redis 共享。维护状态、连接类信息根据业务需要选择进程内或共享实现。

## 重构建议摘要
1. 定义最小化的状态接口（例如 `PluginRegistry`、`MaintainingStateStore`、`SchedulerStore`）。
2. 引入容器注册的 Logger/Cache/PubSub 适配层，确保核心仅依赖抽象。
3. 为插件状态变更增加事件广播，配合 `SyncMessageManager` 实现跨进程通知。
4. 编写回归测试覆盖插件启停、命令执行、集群模式下的状态同步。

