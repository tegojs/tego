# Gateway Removal Plan & Migration Guide

## Overview

In the TachyBase 2.0 architecture, the core will no longer provide Web Server capabilities by default. `Gateway` and its related components (`WSServer`, `IPCSocketServer`) will be removed from the core and provided as plugins instead. This document records Gateway's current responsibilities, use cases, and migration considerations.

## Gateway Current Responsibilities

### 1. HTTP Server Management
- **Start/Stop HTTP Server**: `start()` / `stop()` methods manage `http.Server` instance.
- **Port & Host Configuration**: Configured via environment variables `APP_PORT` / `APP_HOST` or startup parameters.
- **Request Routing**: `requestHandler()` serves as the core entry point, dispatching requests based on URL paths.

### 2. Multi-Application Routing
- **Application Selector Middleware**: `addAppSelectorMiddleware()` supports resolving target application via request headers (`x-app`) or query parameters (`__appName`).
- **AppSupervisor Integration**: Retrieves application instances via `AppSupervisor.getInstance().getApp(appName)` and forwards requests.
- **Application State Check**: Checks application state (`initializing`, `running`, `error`, etc.) before forwarding, returning appropriate error responses.

### 3. Static Asset Serving
- **Client Files**: Serves frontend static assets from `APP_CLIENT_ROOT/dist` directory, supports SPA route rewriting.
- **Upload Files**: Handles file access at `/storage/uploads/` path with compression enabled.
- **Plugin Static Assets**: Exposes static files within plugin packages (via `PLUGIN_STATICS_PATH`), prevents access to `/server/` directory.

### 4. WebSocket Support
- **WSServer Integration**: Built-in `WSServer` instance handles WebSocket connection upgrades.
- **Connection Management**: Maintains WebSocket client mapping, supports grouped message pushing by tags.
- **Application-Level Event Handling**:
  - `Application.registerWSEventHandler()` / `removeWSEventHandler()` allow applications to register custom WebSocket event handlers.
  - Supports four event types: `connection`, `message`, `close`, `error`.
- **State Synchronization**: Listens to `AppSupervisor` events (`appError`, `appMaintainingMessageChanged`, `appStatusChanged`), pushes to frontend via WebSocket.

### 5. IPC Socket Service
- **Inter-Process Communication**: `IPCSocketServer` listens on Unix Socket (`gateway.sock`), receives CLI commands from other processes.
- **Command Forwarding**: Forwards `passCliArgv` type messages to main application for execution.

### 6. Log Management
- **Application-Grouped**: Creates independent Logger instances for each application (via `Registry<SystemLogger>`).
- **Request Tracing**: Generates `X-Request-Id` for each request and injects into log context.

### 7. Error Response
- **Standardized Error Format**: `responseErrorWithCode()` returns unified JSON error responses based on error codes (e.g., `APP_NOT_FOUND`, `APP_INITIALIZING`).
- **Error Definitions**: `errors.ts` defines HTTP status codes and error messages for various application states.

### 8. Custom Handlers
- **Handler Registration**: `addHandler()` allows registering custom request handlers (matched by URL prefix).

## Use Case Analysis

### Case 1: Single-App HTTP Service
- **Current Implementation**: Gateway as sole entry point, forwards requests to `main` application.
- **Dependencies**: `AppSupervisor`, static asset serving, WebSocket.
- **Migration Plan**: Use standard HTTP plugin (e.g., `@tego/plugin-http-server`), directly bind application's Koa callback.

### Case 2: Multi-Tenant/Sub-App Routing
- **Current Implementation**: Resolves target application via `appSelectorMiddlewares`, Gateway coordinates multiple Application instances.
- **Dependencies**: `AppSupervisor`, application state management, WebSocket state sync.
- **Migration Plan**: Use multi-app routing plugin (e.g., `@tego/plugin-multi-app-gateway`), encapsulate AppSupervisor logic.

### Case 3: WebSocket Real-Time Communication
- **Current Implementation**:
  - `WSServer` handles connection upgrades, message dispatch, tag management.
  - `Application.registerWSEventHandler()` provides application-level event hooks.
  - Listens to `AppSupervisor` events to push state changes.
- **Dependencies**: `AppSupervisor`, event system.
- **Migration Plan**: Use WebSocket plugin (e.g., `@tego/plugin-websocket`), inject event bus and application registry via container.

### Case 4: IPC Command Forwarding
- **Current Implementation**: `IPCSocketServer` listens on Unix Socket, receives CLI commands and forwards to main application.
- **Dependencies**: `Application.runAsCLI()`.
- **Migration Plan**: Use IPC plugin (e.g., `@tego/plugin-ipc-server`), resolve CLI executor via container.

### Case 5: Development Mode Hot Reload
- **Current Implementation**: `watch()` method monitors `storage/app.watch.ts` file changes, triggers restart.
- **Dependencies**: File system, process management.
- **Migration Plan**: Use dev tools plugin (e.g., `@tego/plugin-dev-server`), integrate hot reload logic.

## Core Dependencies

### Gateway Dependencies
1. **AppSupervisor**: Retrieve application instances, listen to state changes.
2. **Application**: Forward requests to `app.callback()`, register WebSocket events.
3. **Logger**: Create application-grouped log instances.
4. **Environment Variables**: Read port, paths, socket path configurations.

### Components Depending on Gateway
1. **Application**:
   - `registerWSEventHandler()` / `removeWSEventHandler()` call `Gateway.getInstance()`.
2. **NoticeManager**:
   - Push notifications via `Gateway.getInstance()['wsServer']`.
3. **WSServer**:
   - Listen to `Gateway.getInstance().on('appSelectorChanged')` to update connection tags.
   - Listen to `AppSupervisor` events to push state.
4. **Test Code**:
   - `__tests__/gateway.test.ts` validates multi-app routing and WebSocket functionality.

## Removal Plan

### Phase 1: Interface Abstraction (2.0 Alpha)
1. **Define HTTP Server Interface**
   ```typescript
   interface IHttpServer {
     start(options: { port: number; host: string }): Promise<void>;
     stop(): Promise<void>;
     addHandler(handler: Handler): void;
     getCallback(): (req: IncomingMessage, res: ServerResponse) => void;
   }
   ```

2. **Define WebSocket Interface**
   ```typescript
   interface IWebSocketServer {
     registerEventHandler(appName: string, eventType: string, handler: Function): void;
     removeEventHandler(appName: string, eventType: string, handler: Function): void;
     sendToTag(tagType: string, tagValue: string, message: any): void;
   }
   ```

3. **Define Application Router Interface**
   ```typescript
   interface IAppRouter {
     resolveApp(req: IncomingRequest): Promise<string>;
     addSelectorMiddleware(middleware: AppSelectorMiddleware): void;
   }
   ```

### Phase 2: Plugin Implementation (2.0 Beta)
1. **Create `@tego/plugin-http-server`**
   - Implement `IHttpServer` interface.
   - Support single-app mode (directly bind Application callback).
   - Provide static asset serving capability (optional).

2. **Create `@tego/plugin-websocket`**
   - Implement `IWebSocketServer` interface.
   - Inject event bus and application registry via container.
   - Support application-level event hooks.

3. **Create `@tego/plugin-multi-app-gateway`**
   - Implement `IAppRouter` interface.
   - Encapsulate `AppSupervisor` logic (or use container-registered application management service).
   - Support custom application selector middleware.

4. **Create `@tego/plugin-ipc-server`**
   - Provide IPC Socket service.
   - Resolve CLI executor via container.

### Phase 3: Core Cleanup (2.0 GA)
1. **Remove Gateway-Related Code**
   - Delete `src/gateway/` directory.
   - Remove `Application.registerWSEventHandler()` / `removeWSEventHandler()`.
   - Remove `NoticeManager`'s direct dependency on Gateway.

2. **Update Application**
   - Remove `Gateway.getInstance()` calls.
   - Change WebSocket event registration to resolve `IWebSocketServer` via container.

3. **Update Tests**
   - Migrate `__tests__/gateway.test.ts` to corresponding plugin test suites.

## Migration Considerations

### 1. Configuration Changes
- **Environment Variables**:
  - `APP_PORT`, `APP_HOST` become plugin configuration options.
  - `SOCKET_PATH` becomes IPC plugin configuration.
  - `PLUGIN_STATICS_PATH`, `APP_PUBLIC_PATH` become static asset plugin configuration.
- **Startup Parameters**:
  - `start` command's `--port`, `--host` parameters become plugin parameters.

### 2. API Changes
- **Application API**:
  - `app.registerWSEventHandler()` becomes `container.resolve('websocket').registerEventHandler(app.name, ...)`.
  - `app.removeWSEventHandler()` likewise.
- **NoticeManager**:
  - Inject `IWebSocketServer` during construction instead of directly accessing Gateway.
- **Plugin Development**:
  - Plugins requiring WebSocket functionality declare dependency on `@tego/plugin-websocket`.

### 3. Deployment Changes
- **Single-App Deployment**:
  - Only install `@tego/plugin-http-server`.
  - Configure port and static asset paths.
- **Multi-App Deployment**:
  - Install `@tego/plugin-multi-app-gateway`.
  - Configure application selection strategy (request header, query parameter, domain, etc.).
- **Cluster Mode**:
  - Use application management plugin supporting distributed state.
  - WebSocket connections need sticky sessions or shared state configuration.

### 4. Compatibility Handling
- **Provide Adapter Layer** (optional, transition period only):
  - Create `@tego/plugin-legacy-gateway` providing API compatible with old interface.
  - Mark as deprecated in early 2.x versions, remove in later versions.

### 5. Testing Strategy
- **Unit Tests**:
  - Each plugin independently tests HTTP, WebSocket, routing logic.
- **Integration Tests**:
  - Validate complete functionality after plugin combination (HTTP + WebSocket + multi-app routing).
- **Performance Tests**:
  - Compare request throughput and WebSocket message latency before/after pluginisation.

## Plugin Design Recommendations

### 1. `@tego/plugin-http-server`
- **Responsibility**: Provide basic HTTP service.
- **Configuration**:
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
- **Container Registration**:
  - `IHttpServer` interface implementation.
  - Provide `addHandler()` method for other plugins to register routes.

### 2. `@tego/plugin-websocket`
- **Responsibility**: Provide WebSocket service.
- **Configuration**:
  ```typescript
  {
    path: '/ws',
    heartbeat: 30000,
    maxPayload: 1024 * 1024
  }
  ```
- **Container Registration**:
  - `IWebSocketServer` interface implementation.
  - Listen to event bus in container, push state changes.

### 3. `@tego/plugin-multi-app-gateway`
- **Responsibility**: Multi-app routing and state management.
- **Configuration**:
  ```typescript
  {
    defaultApp: 'main',
    selectorMiddlewares: [
      { type: 'header', key: 'x-app' },
      { type: 'query', key: '__appName' },
      { type: 'domain', mapping: { 'tenant1.example.com': 'tenant1' } }
    ],
    bootstrapper: async (appName) => { /* create app instance */ }
  }
  ```
- **Container Registration**:
  - `IAppRouter` interface implementation.
  - `IApplicationRegistry` interface implementation (encapsulate AppSupervisor logic).

### 4. `@tego/plugin-ipc-server`
- **Responsibility**: Inter-process communication.
- **Configuration**:
  ```typescript
  {
    socketPath: './storage/gateway.sock',
    commandTimeout: 60000
  }
  ```
- **Container Registration**:
  - Listen on Unix Socket, parse commands and invoke CLI executor via container.

## Benefits Assessment

### 1. Architectural Benefits
- **Lighter Core**: Remove HTTP/WebSocket dependencies, core focuses on plugin loading and lifecycle.
- **More Flexible Deployment**: Choose different HTTP server implementations (e.g., Fastify, Express-based).
- **Better Test Isolation**: Core logic can be tested without starting HTTP server.

### 2. Functional Benefits
- **Pluggable Network Layer**: Support custom protocols (gRPC, MQTT, etc.).
- **Distributed-Friendly**: WebSocket and application state can independently scale to distributed implementations.
- **Finer-Grained Access Control**: Plugins can independently configure access policies.

### 3. Developer Experience
- **Clearer Responsibility Separation**: HTTP, WebSocket, routing logic separated into different plugins.
- **Easier Extension**: Adding new protocol support only requires developing new plugin, no core modification.
- **Better Documentation**: Each plugin has independent documentation, lowering learning curve.

## Risks & Challenges

### 1. Migration Cost
- **Existing Project Refactoring**: All code depending on Gateway needs updates.
- **Documentation Updates**: Need to rewrite deployment, configuration, development guides.
- **Ecosystem Adaptation**: Third-party plugins need to update dependency declarations.

### 2. Performance Impact
- **Plugin Loading Overhead**: Initialization of multiple plugins may increase startup time.
- **Indirect Call Overhead**: Resolving services via container may be slightly slower than direct calls.

### 3. Debugging Complexity
- **Issue Localization**: Network layer issues require cross-plugin troubleshooting.
- **Log Aggregation**: Need to unify plugin log format and tracing mechanism.

## Migration Checklist

- [ ] Define HTTP, WebSocket, routing-related interfaces.
- [ ] Implement `@tego/plugin-http-server` and pass unit tests.
- [ ] Implement `@tego/plugin-websocket` and validate event pushing.
- [ ] Implement `@tego/plugin-multi-app-gateway` and test multi-app routing.
- [ ] Implement `@tego/plugin-ipc-server` and validate command forwarding.
- [ ] Update `Application` to remove Gateway dependency.
- [ ] Update `NoticeManager` to inject WebSocket service via container.
- [ ] Migrate `__tests__/gateway.test.ts` to plugin test suites.
- [ ] Write migration guide and sample code.
- [ ] Update deployment documentation and configuration templates.
- [ ] Release 2.0 Alpha version and collect feedback.
- [ ] Optimize plugin API and configuration format based on feedback.
- [ ] Complete core cleanup and documentation updates before 2.0 GA.

## Conclusion

Gateway removal is a key step in TachyBase 2.0 architecture refactoring, separating network layer capabilities from core to plugins, making the core more focused on plugin loading, event system, and dependency injection. Through proper interface abstraction and plugin design, functionality integrity can be maintained while improving architecture flexibility and extensibility. The migration process requires careful planning to ensure smooth transition of existing functionality and lay the foundation for future distributed deployment and protocol extension.

