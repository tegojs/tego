# Gateway 移除计划与迁移指南

## 概述

在 TachyBase 2.0 架构中，核心将不再默认提供 Web Server 能力，`Gateway` 及其相关组件（`WSServer`、`IPCSocketServer`）将从核心移除，改为通过插件形式提供。本文档记录 Gateway 的当前职责、使用场景及迁移注意事项。

## Gateway 当前职责

### 1. HTTP 服务器管理
- **启动/停止 HTTP Server**：`start()` / `stop()` 方法管理 `http.Server` 实例。
- **端口与主机配置**：通过环境变量 `APP_PORT` / `APP_HOST` 或启动参数配置。
- **请求路由**：`requestHandler()` 作为核心入口，根据 URL 路径分发请求。

### 2. 多应用路由
- **应用选择中间件**：`addAppSelectorMiddleware()` 支持通过请求头（`x-app`）或查询参数（`__appName`）解析目标应用。
- **与 AppSupervisor 集成**：通过 `AppSupervisor.getInstance().getApp(appName)` 获取应用实例并转发请求。
- **应用状态检查**：在转发前检查应用状态（`initializing`, `running`, `error` 等），返回相应错误响应。

### 3. 静态资源服务
- **客户端文件**：服务 `APP_CLIENT_ROOT/dist` 目录下的前端静态资源，支持 SPA 路由重写。
- **上传文件**：处理 `/storage/uploads/` 路径的文件访问，启用压缩。
- **插件静态资源**：暴露插件包内的静态文件（通过 `PLUGIN_STATICS_PATH`），防止访问 `/server/` 目录。

### 4. WebSocket 支持
- **WSServer 集成**：内置 `WSServer` 实例，处理 WebSocket 连接升级。
- **连接管理**：维护 WebSocket 客户端映射，支持按标签（tag）分组推送消息。
- **应用级事件处理**：
  - `Application.registerWSEventHandler()` / `removeWSEventHandler()` 允许应用注册自定义 WebSocket 事件处理函数。
  - 支持 `connection`, `message`, `close`, `error` 四种事件类型。
- **状态同步**：监听 `AppSupervisor` 事件（`appError`, `appMaintainingMessageChanged`, `appStatusChanged`），通过 WebSocket 推送到前端。

### 5. IPC Socket 服务
- **进程间通信**：`IPCSocketServer` 监听 Unix Socket（`gateway.sock`），接收其他进程的 CLI 命令。
- **命令转发**：将 `passCliArgv` 类型的消息转发给主应用执行。

### 6. 日志管理
- **按应用分组**：为每个应用创建独立的 Logger 实例（通过 `Registry<SystemLogger>`）。
- **请求追踪**：为每个请求生成 `X-Request-Id` 并注入到日志上下文。

### 7. 错误响应
- **标准化错误格式**：`responseErrorWithCode()` 根据错误代码（如 `APP_NOT_FOUND`, `APP_INITIALIZING`）返回统一的 JSON 错误响应。
- **错误定义**：`errors.ts` 定义了各种应用状态对应的 HTTP 状态码和错误消息。

### 8. 自定义处理器
- **Handler 注册**：`addHandler()` 允许注册自定义请求处理器（按 URL 前缀匹配）。

## 使用场景分析

### 场景 1：单应用 HTTP 服务
- **当前实现**：Gateway 作为唯一入口，转发请求到 `main` 应用。
- **依赖**：`AppSupervisor`、静态资源服务、WebSocket。
- **迁移方案**：使用标准 HTTP 插件（如 `@tego/plugin-http-server`），直接绑定应用的 Koa callback。

### 场景 2：多租户/子应用路由
- **当前实现**：通过 `appSelectorMiddlewares` 解析目标应用，Gateway 协调多个 Application 实例。
- **依赖**：`AppSupervisor`、应用状态管理、WebSocket 状态同步。
- **迁移方案**：使用多应用路由插件（如 `@tego/plugin-multi-app-gateway`），封装 AppSupervisor 逻辑。

### 场景 3：WebSocket 实时通信
- **当前实现**：
  - `WSServer` 处理连接升级、消息分发、标签管理。
  - `Application.registerWSEventHandler()` 提供应用级事件钩子。
  - 监听 `AppSupervisor` 事件推送状态变更。
- **依赖**：`AppSupervisor`、事件系统。
- **迁移方案**：使用 WebSocket 插件（如 `@tego/plugin-websocket`），通过容器注入事件总线和应用注册表。

### 场景 4：IPC 命令转发
- **当前实现**：`IPCSocketServer` 监听 Unix Socket，接收 CLI 命令并转发给主应用。
- **依赖**：`Application.runAsCLI()`。
- **迁移方案**：使用 IPC 插件（如 `@tego/plugin-ipc-server`），通过容器解析 CLI 执行器。

### 场景 5：开发模式热重载
- **当前实现**：`watch()` 方法监听 `storage/app.watch.ts` 文件变化，触发重启。
- **依赖**：文件系统、进程管理。
- **迁移方案**：使用开发工具插件（如 `@tego/plugin-dev-server`），集成热重载逻辑。

## 核心依赖关系

### Gateway 依赖的核心组件
1. **AppSupervisor**：获取应用实例、监听状态变更。
2. **Application**：转发请求到 `app.callback()`，注册 WebSocket 事件。
3. **Logger**：创建按应用分组的日志实例。
4. **环境变量**：读取端口、路径、Socket 路径等配置。

### 依赖 Gateway 的组件
1. **Application**：
   - `registerWSEventHandler()` / `removeWSEventHandler()` 调用 `Gateway.getInstance()`。
2. **NoticeManager**：
   - 通过 `Gateway.getInstance()['wsServer']` 推送通知。
3. **WSServer**：
   - 监听 `Gateway.getInstance().on('appSelectorChanged')` 更新连接标签。
   - 监听 `AppSupervisor` 事件推送状态。
4. **测试代码**：
   - `__tests__/gateway.test.ts` 验证多应用路由和 WebSocket 功能。

## 移除计划

### 阶段 1：抽象接口（2.0 Alpha）
1. **定义 HTTP Server 接口**
   ```typescript
   interface IHttpServer {
     start(options: { port: number; host: string }): Promise<void>;
     stop(): Promise<void>;
     addHandler(handler: Handler): void;
     getCallback(): (req: IncomingMessage, res: ServerResponse) => void;
   }
   ```

2. **定义 WebSocket 接口**
   ```typescript
   interface IWebSocketServer {
     registerEventHandler(appName: string, eventType: string, handler: Function): void;
     removeEventHandler(appName: string, eventType: string, handler: Function): void;
     sendToTag(tagType: string, tagValue: string, message: any): void;
   }
   ```

3. **定义应用路由接口**
   ```typescript
   interface IAppRouter {
     resolveApp(req: IncomingRequest): Promise<string>;
     addSelectorMiddleware(middleware: AppSelectorMiddleware): void;
   }
   ```

### 阶段 2：插件化实现（2.0 Beta）
1. **创建 `@tego/plugin-http-server`**
   - 实现 `IHttpServer` 接口。
   - 支持单应用模式（直接绑定 Application callback）。
   - 提供静态资源服务能力（可选）。

2. **创建 `@tego/plugin-websocket`**
   - 实现 `IWebSocketServer` 接口。
   - 通过容器注入事件总线和应用注册表。
   - 支持应用级事件钩子。

3. **创建 `@tego/plugin-multi-app-gateway`**
   - 实现 `IAppRouter` 接口。
   - 封装 `AppSupervisor` 逻辑（或使用容器注册的应用管理服务）。
   - 支持自定义应用选择中间件。

4. **创建 `@tego/plugin-ipc-server`**
   - 提供 IPC Socket 服务。
   - 通过容器解析 CLI 执行器。

### 阶段 3：核心清理（2.0 GA）
1. **移除 Gateway 相关代码**
   - 删除 `src/gateway/` 目录。
   - 移除 `Application.registerWSEventHandler()` / `removeWSEventHandler()`。
   - 移除 `NoticeManager` 对 Gateway 的直接依赖。

2. **更新 Application**
   - 移除 `Gateway.getInstance()` 调用。
   - WebSocket 事件注册改为通过容器解析 `IWebSocketServer`。

3. **更新测试**
   - 将 `__tests__/gateway.test.ts` 迁移到对应插件的测试套件。

## 迁移注意事项

### 1. 配置变更
- **环境变量**：
  - `APP_PORT`, `APP_HOST` 改为插件配置项。
  - `SOCKET_PATH` 改为 IPC 插件配置。
  - `PLUGIN_STATICS_PATH`, `APP_PUBLIC_PATH` 改为静态资源插件配置。
- **启动参数**：
  - `start` 命令的 `--port`, `--host` 参数改为插件参数。

### 2. API 变更
- **Application API**：
  - `app.registerWSEventHandler()` 改为 `container.resolve('websocket').registerEventHandler(app.name, ...)`。
  - `app.removeWSEventHandler()` 同理。
- **NoticeManager**：
  - 构造时注入 `IWebSocketServer` 而非直接访问 Gateway。
- **插件开发**：
  - 需要 WebSocket 功能的插件声明依赖 `@tego/plugin-websocket`。

### 3. 部署变更
- **单应用部署**：
  - 只需安装 `@tego/plugin-http-server`。
  - 配置端口和静态资源路径。
- **多应用部署**：
  - 安装 `@tego/plugin-multi-app-gateway`。
  - 配置应用选择策略（请求头、查询参数、域名等）。
- **Cluster 模式**：
  - 使用支持分布式状态的应用管理插件。
  - WebSocket 连接需要配置粘性会话或共享状态。

### 4. 兼容性处理
- **提供适配层**（可选，仅用于过渡期）：
  - 创建 `@tego/plugin-legacy-gateway` 提供与旧 API 兼容的接口。
  - 在 2.x 初期版本中标记为 deprecated，后续版本移除。

### 5. 测试策略
- **单元测试**：
  - 每个插件独立测试 HTTP、WebSocket、路由逻辑。
- **集成测试**：
  - 验证插件组合后的完整功能（HTTP + WebSocket + 多应用路由）。
- **性能测试**：
  - 对比插件化前后的请求吞吐量、WebSocket 消息延迟。

## 插件设计建议

### 1. `@tego/plugin-http-server`
- **职责**：提供基础 HTTP 服务。
- **配置**：
  ```typescript
  {
    port: 3000,
    host: '0.0.0.0',
    staticPaths: [
      { prefix: '/public', directory: './public' },
      { prefix: '/uploads', directory: './storage/uploads' }
    ],
    compression: true
  }
  ```
- **容器注册**：
  - `IHttpServer` 接口实现。
  - 提供 `addHandler()` 方法供其他插件注册路由。

### 2. `@tego/plugin-websocket`
- **职责**：提供 WebSocket 服务。
- **配置**：
  ```typescript
  {
    path: '/ws',
    heartbeat: 30000,
    maxPayload: 1024 * 1024
  }
  ```
- **容器注册**：
  - `IWebSocketServer` 接口实现。
  - 监听容器中的事件总线，推送状态变更。

### 3. `@tego/plugin-multi-app-gateway`
- **职责**：多应用路由与状态管理。
- **配置**：
  ```typescript
  {
    defaultApp: 'main',
    selectorMiddlewares: [
      { type: 'header', key: 'x-app' },
      { type: 'query', key: '__appName' },
      { type: 'domain', mapping: { 'tenant1.example.com': 'tenant1' } }
    ],
    bootstrapper: async (appName) => { /* 创建应用实例 */ }
  }
  ```
- **容器注册**：
  - `IAppRouter` 接口实现。
  - `IApplicationRegistry` 接口实现（封装 AppSupervisor 逻辑）。

### 4. `@tego/plugin-ipc-server`
- **职责**：进程间通信。
- **配置**：
  ```typescript
  {
    socketPath: './storage/gateway.sock',
    commandTimeout: 60000
  }
  ```
- **容器注册**：
  - 监听 Unix Socket，解析命令并通过容器调用 CLI 执行器。

## 收益评估

### 1. 架构收益
- **核心更轻量**：移除 HTTP/WebSocket 依赖，核心专注于插件加载和生命周期。
- **更灵活的部署**：可选择不同的 HTTP 服务器实现（如基于 Fastify、Express）。
- **更好的测试隔离**：核心逻辑无需启动 HTTP 服务器即可测试。

### 2. 功能收益
- **可插拔的网络层**：支持自定义协议（gRPC、MQTT 等）。
- **分布式友好**：WebSocket 和应用状态可以独立扩展到分布式实现。
- **更细粒度的权限控制**：插件可以独立配置访问策略。

### 3. 开发体验
- **更清晰的职责划分**：HTTP、WebSocket、路由逻辑分离到不同插件。
- **更容易扩展**：新增协议支持只需开发新插件，无需修改核心。
- **更好的文档**：每个插件独立文档，降低学习曲线。

## 风险与挑战

### 1. 迁移成本
- **现有项目改造**：所有依赖 Gateway 的代码需要更新。
- **文档更新**：需要重写部署、配置、开发指南。
- **生态适配**：第三方插件需要更新依赖声明。

### 2. 性能影响
- **插件加载开销**：多个插件的初始化可能增加启动时间。
- **间接调用开销**：通过容器解析服务可能略慢于直接调用。

### 3. 调试复杂度
- **问题定位**：网络层问题需要跨插件排查。
- **日志聚合**：需要统一插件日志格式和追踪机制。

## 迁移检查清单

- [ ] 定义 HTTP、WebSocket、路由相关接口。
- [ ] 实现 `@tego/plugin-http-server` 并通过单元测试。
- [ ] 实现 `@tego/plugin-websocket` 并验证事件推送。
- [ ] 实现 `@tego/plugin-multi-app-gateway` 并测试多应用路由。
- [ ] 实现 `@tego/plugin-ipc-server` 并验证命令转发。
- [ ] 更新 `Application` 移除 Gateway 依赖。
- [ ] 更新 `NoticeManager` 通过容器注入 WebSocket 服务。
- [ ] 迁移 `__tests__/gateway.test.ts` 到插件测试套件。
- [ ] 编写迁移指南和示例代码。
- [ ] 更新部署文档和配置模板。
- [ ] 发布 2.0 Alpha 版本并收集反馈。
- [ ] 根据反馈优化插件 API 和配置格式。
- [ ] 在 2.0 GA 前完成核心清理和文档更新。

## 结论

Gateway 的移除是 TachyBase 2.0 架构重构的关键一步，将网络层能力从核心剥离到插件，使核心更专注于插件加载、事件系统和依赖注入。通过合理的接口抽象和插件设计，可以在保持功能完整性的同时，提升架构的灵活性和可扩展性。迁移过程需要仔细规划，确保现有功能平滑过渡，并为未来的分布式部署和协议扩展奠定基础。

