# AppSupervisor 分析与移除可行性评估

## 概述

`AppSupervisor` 是 TachyBase Core 内置的**多应用实例管理器**，采用单例模式，负责在同一进程内协调多个 `Application` 实例的生命周期、状态同步与错误处理。它主要服务于"多租户"或"多子应用"场景，允许一个 Gateway 根据请求路由到不同的应用实例。

## 核心职责

1. **应用注册与查找**
   - `addApp(app)`: 将 Application 实例注册到 Supervisor。
   - `getApp(appName)`: 按名称获取应用实例，支持延迟引导（通过 `appBootstrapper`）。
   - `hasApp(appName)`: 检查应用是否已注册。
   - `removeApp(appName)`: 销毁并移除应用。

2. **状态管理**
   - 维护每个应用的状态：`initializing | initialized | running | commanding | stopped | error | not_found`。
   - 监听应用事件（`maintaining`, `__started`, `afterStop`, `afterDestroy`）并同步状态到 Supervisor。
   - 提供 `setAppStatus()` / `getAppStatus()` 供外部查询。

3. **错误追踪**
   - `setAppError()` / `hasAppError()` / `clearAppError()`: 记录应用级错误并触发 `appError` 事件。

4. **运行模式控制**
   - 支持 `single` 模式（通过 `STARTUP_SUBAPP` 环境变量指定单一子应用）和 `multiple` 模式。
   - `blockApps`: 阻止特定应用被自动引导。

5. **引导与互斥**
   - `setAppBootstrapper()`: 注册应用工厂函数，用于延迟创建应用实例。
   - `bootStrapApp()`: 使用 Mutex 保证同一应用只被引导一次。

6. **心跳与活跃度**
   - `touchApp()` / `lastSeenAt`: 记录应用最后访问时间，用于判断应用是否活跃。

7. **事件广播**
   - 发出 `afterAppAdded`, `appStatusChanged`, `appMaintainingMessageChanged`, `appMaintainingStatusChanged`, `appError` 等事件供外部订阅。

## 使用场景

### 1. Gateway 路由多应用
- `Gateway.requestHandler()` 根据请求头或查询参数（`x-app`, `__appName`）解析目标应用名称。
- 调用 `AppSupervisor.getInstance().getApp(appName)` 获取或引导应用实例。
- 根据应用状态决定是否转发请求、返回错误或触发启动。

### 2. 多租户架构
- 每个租户对应一个独立的 `Application` 实例（可能共享或独立数据库）。
- Supervisor 管理租户应用的生命周期，避免重复创建。

### 3. 子应用隔离
- 在测试或开发环境中，通过 `STARTUP_SUBAPP` 只启动特定子应用，加快启动速度。

### 4. 状态监控与管理界面
- 管理后台可订阅 Supervisor 事件，实时展示各应用状态、错误、维护消息。

## 依赖关系

- **被依赖方**：
  - `Application` 构造时自动调用 `AppSupervisor.getInstance().addApp(this)`。
  - `Gateway` 在请求处理和启动流程中频繁调用 Supervisor 方法。
  - `WSServer` 和 `IPCSocketServer` 通过 Supervisor 获取应用实例。
  - 测试代码（`__tests__/multiple-application.test.ts`, `__tests__/gateway.test.ts`）验证多应用场景。

- **依赖项**：
  - `async-mutex`: 保证应用引导的互斥性。
  - `Application` 事件：监听生命周期钩子同步状态。

## 移除可行性分析

### 场景 1：单应用部署（无多租户需求）
- **可行性**：✅ **高度可行**
- **条件**：
  - 应用始终只有一个 `main` 实例。
  - Gateway 不需要路由到多个应用。
- **改造方案**：
  - 移除 `AppSupervisor` 单例。
  - `Application` 构造时不再注册到 Supervisor。
  - `Gateway` 直接持有 `mainApp` 引用，不再通过 Supervisor 查找。
  - 状态管理简化为 `Application` 内部属性。
- **收益**：
  - 减少全局单例依赖，降低耦合。
  - 简化代码路径，提升可测试性。
  - 减少内存开销（不再维护应用注册表、状态映射）。

### 场景 2：多应用部署（多租户或子应用）
- **可行性**：⚠️ **需要替代方案**
- **条件**：
  - 需要在同一进程内管理多个应用实例。
  - Gateway 需要根据请求动态路由到不同应用。
- **改造方案**：
  - 将 `AppSupervisor` 改造为容器注册的服务（非全局单例）。
  - 通过 DI 容器注入到 `Gateway` 和需要多应用管理的插件中。
  - 状态管理可选持久化到 Redis（支持 cluster 模式）或保持进程内。
- **收益**：
  - 解除全局单例依赖，支持多实例测试。
  - 更灵活的生命周期管理（可按需启用/禁用多应用能力）。
  - 为 cluster 模式下的应用状态共享提供扩展点。

### 场景 3：Cluster 模式
- **可行性**：⚠️ **需要重新设计**
- **问题**：
  - 当前 `AppSupervisor` 是进程内单例，无法跨进程共享状态。
  - 多个 worker 进程各自维护独立的应用注册表，可能导致状态不一致。
- **改造方案**：
  - 将应用状态存储到 Redis 或共享数据库。
  - Supervisor 改为"状态代理"，从共享存储读取应用状态。
  - 应用引导和状态变更通过分布式锁或主进程协调。
- **收益**：
  - 支持真正的多进程部署。
  - 应用状态在所有 worker 间保持一致。

## 移除的潜在收益

1. **降低复杂度**
   - 移除全局单例，减少隐式依赖。
   - 简化 `Application` 构造逻辑（不再自动注册）。

2. **提升可测试性**
   - 不再依赖全局状态，测试隔离更彻底。
   - 可以为不同测试场景注入不同的应用管理器实现。

3. **更好的 DI 集成**
   - 将应用管理能力注册到容器，符合 2.0 架构方向。
   - 插件可按需依赖应用管理服务，而非强制使用全局单例。

4. **灵活的部署模式**
   - 单应用场景无需引入多应用管理开销。
   - 多应用场景可选择进程内或分布式实现。

## 移除的潜在风险

1. **破坏现有多租户架构**
   - 如果产品依赖多应用路由，移除 Supervisor 需要提供替代方案。

2. **Gateway 重构成本**
   - `Gateway.requestHandler()` 深度依赖 Supervisor，需要重写路由逻辑。

3. **状态同步复杂化**
   - 当前通过 Supervisor 事件统一管理状态变更，移除后需要新的机制。

4. **测试用例失效**
   - `__tests__/multiple-application.test.ts` 等测试需要重写。

## 推荐方案

### 短期（TachyBase 2.0 Alpha）
1. **保留 AppSupervisor，但改为容器服务**
   - 不再使用全局单例，改为通过容器注册和解析。
   - `Application` 构造时通过容器获取 Supervisor 并注册自身。
   - `Gateway` 通过容器解析 Supervisor。

2. **抽象应用管理接口**
   - 定义 `IApplicationRegistry` 接口，提供 `register/get/remove/getStatus` 等方法。
   - `AppSupervisor` 作为默认实现，支持单应用场景下的轻量级实现（如 `SingleAppRegistry`）。

3. **配置化多应用支持**
   - 通过配置项 `multiApp: boolean` 决定是否启用多应用管理。
   - 单应用模式下自动使用简化实现。

### 中期（TachyBase 2.0 Beta）
1. **实现分布式应用管理**
   - 提供 `RedisApplicationRegistry` 实现，支持 cluster 模式。
   - 应用状态存储到 Redis，使用分布式锁协调引导。

2. **插件化 Gateway 路由**
   - 将多应用路由逻辑抽取为插件（如 `@tego/plugin-multi-app-router`）。
   - 核心 Gateway 只负责基础 HTTP 服务，路由策略由插件提供。

### 长期（TachyBase 2.x 稳定版）
1. **完全移除 AppSupervisor**
   - 单应用场景下无需应用管理器。
   - 多应用场景由专门的插件提供，核心不再内置。

2. **标准化应用生命周期协议**
   - 定义跨进程的应用状态同步协议（基于 Pub/Sub 或 gRPC）。
   - 支持应用实例在不同进程甚至不同机器上运行。

## 结论

- **AppSupervisor 是内置的多应用管理能力**，为多租户和子应用场景提供支持。
- **单应用场景下可以移除**，收益包括降低复杂度、提升可测试性、更好的 DI 集成。
- **多应用场景下需要替代方案**，建议先改为容器服务，再逐步插件化。
- **Cluster 模式需要重新设计**，当前实现无法跨进程共享状态。
- **推荐路线**：容器化 → 接口抽象 → 插件化 → 最终移除核心依赖。

## 迁移检查清单

- [ ] 梳理所有调用 `AppSupervisor.getInstance()` 的代码路径。
- [ ] 定义 `IApplicationRegistry` 接口及默认实现。
- [ ] 将 Supervisor 注册到容器，修改 `Application` 和 `Gateway` 的依赖方式。
- [ ] 提供单应用模式的简化实现（`SingleAppRegistry`）。
- [ ] 编写多应用场景的集成测试，验证容器化后的行为一致性。
- [ ] 实现 Redis 或其他分布式存储的应用状态管理。
- [ ] 更新文档，说明多应用配置和部署方式。
- [ ] 在 2.0 正式版前评估是否完全移除或保留为可选插件。

