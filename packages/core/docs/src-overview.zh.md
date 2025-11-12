# TachyBase Core `src` 功能概览

## 目录功能速览
- `application.ts`：核心入口，负责应用生命周期、资源初始化、事件调度以及与插件系统、数据库、缓存、网关等服务的编排。
- `app-command.ts` / `commands/`：基于 `commander` 的 CLI 封装与具体命令实现，支撑安装、迁移、运行等运维操作。
- `app-supervisor.ts`：多实例管理器，协调同一进程中的多个应用实例。
- `aes-encryptor.ts`：用于处理敏感配置的 AES 加解密工具。
- `environment.ts`：统一读取与管理运行环境配置。
- `helper.ts` 与 `helpers/`：提供应用初始化、资源注册、版本管理等辅助函数。
- `main-data-source.ts` / `migration.ts` / `migrations/`：定义主数据源、数据库迁移入口以及内置迁移脚本。
- `acl/`：封装访问控制（ACL）策略与可用操作声明。
- `cache/`：创建缓存管理器并暴露缓存适配能力。
- `cron/`：封装 `CronJobManager`，用于注册与调度定时任务。
- `gateway/`：实现 HTTP、WebSocket 网关及 IPC 通信，向外暴露实时能力。
- `middlewares/`：内置 Koa 中间件（数据包装、变量解析、国际化等）。
- `locale/`：应用级国际化加载与资源注册。
- `notice/`：通过网关向前端推送系统通知、状态提示与自定义事件。
- `plugin.ts` 与 `plugin-manager/`：插件基类、依赖解析、生命周期钩子、静态资源服务等插件生态能力。
- `pub-sub-manager/`：封装内存等多种 Pub/Sub 适配器，支撑分布式消息通知。
- `sync-message-manager.ts`：对等实例之间的同步消息分发器。
- `errors/`：核心业务异常类型。
- `__tests__/`：针对应用生命周期、命令、网关等核心模块的自动化测试。

## `Application` 事件清单
所有事件均在 `application.ts` 中通过 `emit` 或 `emitAsync` 发出，可供插件或外部模块订阅：

- `maintaining`：维护指令状态更新时触发，附带当前命令及状态信息。
- `maintainingMessageChanged`：维护提示文本变化时触发，包含最新提示及状态。
- `beforeLoad` / `afterLoad`：调用 `load()` 时，在插件加载前后触发。
- `beforeReload` / `afterReload`：调用 `reload()` 时，在重载流程前后触发。
- `beforeStart` / `afterStart`：应用启动流程的前后钩子。
- `__started`：`start()` 完成后统一广播，携带维护状态与启动参数。
- `beforeStop` / `afterStop`：`stop()` 流程以及 `restart()` 中复用的停机前后钩子。
- `beforeDestroy` / `afterDestroy`：销毁流程前后触发，便于释放资源。
- `beforeInstall` / `afterInstall`：安装流程中插件及数据库准备的前后钩子。
- `afterUpgrade`：升级流程完成后触发。
- `__restarted`：`restart()` 成功后触发，通知外部实例被重启。

