# AppSupervisor Analysis & Removal Feasibility

## Overview

`AppSupervisor` is TachyBase Core's built-in **multi-application instance manager**, implemented as a singleton. It coordinates the lifecycle, state synchronisation, and error handling of multiple `Application` instances within a single process. It primarily serves "multi-tenant" or "sub-application" scenarios, enabling a Gateway to route requests to different application instances.

## Core Responsibilities

1. **Application Registration & Lookup**
   - `addApp(app)`: Registers an Application instance with the Supervisor.
   - `getApp(appName)`: Retrieves an application by name, supporting lazy bootstrapping (via `appBootstrapper`).
   - `hasApp(appName)`: Checks if an application is registered.
   - `removeApp(appName)`: Destroys and removes an application.

2. **State Management**
   - Maintains state for each application: `initializing | initialized | running | commanding | stopped | error | not_found`.
   - Listens to application events (`maintaining`, `__started`, `afterStop`, `afterDestroy`) and syncs state to the Supervisor.
   - Provides `setAppStatus()` / `getAppStatus()` for external queries.

3. **Error Tracking**
   - `setAppError()` / `hasAppError()` / `clearAppError()`: Records application-level errors and emits `appError` events.

4. **Running Mode Control**
   - Supports `single` mode (via `STARTUP_SUBAPP` env var for a specific sub-app) and `multiple` mode.
   - `blockApps`: Prevents specific applications from being auto-bootstrapped.

5. **Bootstrapping & Mutual Exclusion**
   - `setAppBootstrapper()`: Registers an application factory function for lazy instantiation.
   - `bootStrapApp()`: Uses a Mutex to ensure each application is bootstrapped only once.

6. **Heartbeat & Activity**
   - `touchApp()` / `lastSeenAt`: Records the last access time of an application to determine activity.

7. **Event Broadcasting**
   - Emits `afterAppAdded`, `appStatusChanged`, `appMaintainingMessageChanged`, `appMaintainingStatusChanged`, `appError` for external subscribers.

## Use Cases

### 1. Gateway Routing to Multiple Apps
- `Gateway.requestHandler()` parses the target application name from request headers or query params (`x-app`, `__appName`).
- Calls `AppSupervisor.getInstance().getApp(appName)` to retrieve or bootstrap the application instance.
- Decides whether to forward the request, return an error, or trigger startup based on application state.

### 2. Multi-Tenant Architecture
- Each tenant corresponds to an independent `Application` instance (with shared or isolated databases).
- Supervisor manages tenant application lifecycles, avoiding duplicate creation.

### 3. Sub-Application Isolation
- In test or development environments, use `STARTUP_SUBAPP` to start only a specific sub-app, speeding up startup.

### 4. State Monitoring & Admin UI
- Admin dashboards can subscribe to Supervisor events to display real-time application status, errors, and maintenance messages.

## Dependencies

- **Depended Upon By**:
  - `Application` automatically calls `AppSupervisor.getInstance().addApp(this)` during construction.
  - `Gateway` frequently calls Supervisor methods in request handling and startup flows.
  - `WSServer` and `IPCSocketServer` retrieve application instances via Supervisor.
  - Test code (`__tests__/multiple-application.test.ts`, `__tests__/gateway.test.ts`) validates multi-app scenarios.

- **Dependencies**:
  - `async-mutex`: Ensures mutual exclusion during application bootstrapping.
  - `Application` events: Listens to lifecycle hooks to sync state.

## Removal Feasibility Analysis

### Scenario 1: Single-App Deployment (No Multi-Tenant Needs)
- **Feasibility**: ✅ **Highly Feasible**
- **Conditions**:
  - Application always has only one `main` instance.
  - Gateway does not need to route to multiple applications.
- **Refactor Plan**:
  - Remove `AppSupervisor` singleton.
  - `Application` no longer registers with Supervisor during construction.
  - `Gateway` directly holds a `mainApp` reference instead of looking up via Supervisor.
  - State management simplified to internal `Application` properties.
- **Benefits**:
  - Reduces global singleton dependencies, lowering coupling.
  - Simplifies code paths, improving testability.
  - Reduces memory overhead (no application registry or state maps).

### Scenario 2: Multi-App Deployment (Multi-Tenant or Sub-Apps)
- **Feasibility**: ⚠️ **Requires Alternative Solution**
- **Conditions**:
  - Need to manage multiple application instances within the same process.
  - Gateway needs to dynamically route requests to different applications.
- **Refactor Plan**:
  - Transform `AppSupervisor` into a container-registered service (not a global singleton).
  - Inject via DI container into `Gateway` and plugins requiring multi-app management.
  - State management can optionally persist to Redis (for cluster mode) or remain in-process.
- **Benefits**:
  - Eliminates global singleton dependency, supporting multi-instance testing.
  - More flexible lifecycle management (multi-app capability can be enabled/disabled as needed).
  - Provides extension points for application state sharing in cluster mode.

### Scenario 3: Cluster Mode
- **Feasibility**: ⚠️ **Requires Redesign**
- **Issues**:
  - Current `AppSupervisor` is a process-local singleton, unable to share state across processes.
  - Multiple worker processes each maintain independent application registries, potentially causing state inconsistencies.
- **Refactor Plan**:
  - Store application state in Redis or a shared database.
  - Transform Supervisor into a "state proxy" that reads application state from shared storage.
  - Coordinate application bootstrapping and state changes via distributed locks or a leader process.
- **Benefits**:
  - Supports true multi-process deployment.
  - Application state remains consistent across all workers.

## Potential Benefits of Removal

1. **Reduced Complexity**
   - Eliminates global singleton, reducing implicit dependencies.
   - Simplifies `Application` construction logic (no automatic registration).

2. **Improved Testability**
   - No longer relies on global state; test isolation is more thorough.
   - Different application manager implementations can be injected for different test scenarios.

3. **Better DI Integration**
   - Registers application management capability in the container, aligning with 2.0 architecture direction.
   - Plugins can depend on application management services as needed, rather than being forced to use a global singleton.

4. **Flexible Deployment Modes**
   - Single-app scenarios avoid multi-app management overhead.
   - Multi-app scenarios can choose in-process or distributed implementations.

## Potential Risks of Removal

1. **Breaks Existing Multi-Tenant Architecture**
   - If the product relies on multi-app routing, removing Supervisor requires an alternative solution.

2. **Gateway Refactor Cost**
   - `Gateway.requestHandler()` heavily depends on Supervisor; routing logic needs rewriting.

3. **State Sync Complexity**
   - Currently, state changes are uniformly managed via Supervisor events; removal requires a new mechanism.

4. **Test Case Invalidation**
   - Tests like `__tests__/multiple-application.test.ts` need rewriting.

## Recommended Approach

### Short-Term (TachyBase 2.0 Alpha)
1. **Keep AppSupervisor, but as a Container Service**
   - No longer use global singleton; register and resolve via container.
   - `Application` retrieves Supervisor from container and registers itself during construction.
   - `Gateway` resolves Supervisor via container.

2. **Abstract Application Management Interface**
   - Define `IApplicationRegistry` interface with `register/get/remove/getStatus` methods.
   - `AppSupervisor` as default implementation; support lightweight implementation for single-app scenarios (e.g., `SingleAppRegistry`).

3. **Configurable Multi-App Support**
   - Use config option `multiApp: boolean` to decide whether to enable multi-app management.
   - Single-app mode automatically uses simplified implementation.

### Mid-Term (TachyBase 2.0 Beta)
1. **Implement Distributed Application Management**
   - Provide `RedisApplicationRegistry` implementation for cluster mode.
   - Store application state in Redis, using distributed locks to coordinate bootstrapping.

2. **Pluginise Gateway Routing**
   - Extract multi-app routing logic into a plugin (e.g., `@tego/plugin-multi-app-router`).
   - Core Gateway only handles basic HTTP serving; routing strategy provided by plugins.

### Long-Term (TachyBase 2.x Stable)
1. **Fully Remove AppSupervisor**
   - Single-app scenarios no longer need an application manager.
   - Multi-app scenarios provided by dedicated plugins; core no longer includes it.

2. **Standardise Application Lifecycle Protocol**
   - Define cross-process application state sync protocol (based on Pub/Sub or gRPC).
   - Support application instances running in different processes or even different machines.

## Conclusion

- **AppSupervisor is a built-in multi-app management capability**, supporting multi-tenant and sub-application scenarios.
- **Can be removed in single-app scenarios**, with benefits including reduced complexity, improved testability, and better DI integration.
- **Multi-app scenarios require an alternative solution**; recommend first converting to a container service, then gradually pluginising.
- **Cluster mode requires redesign**; current implementation cannot share state across processes.
- **Recommended roadmap**: Containerise → Interface abstraction → Pluginise → Eventually remove core dependency.

## Migration Checklist

- [ ] Identify all code paths calling `AppSupervisor.getInstance()`.
- [ ] Define `IApplicationRegistry` interface and default implementation.
- [ ] Register Supervisor in container, modify `Application` and `Gateway` dependency methods.
- [ ] Provide simplified implementation for single-app mode (`SingleAppRegistry`).
- [ ] Write integration tests for multi-app scenarios to verify consistent behaviour after containerisation.
- [ ] Implement Redis or other distributed storage for application state management.
- [ ] Update documentation to explain multi-app configuration and deployment.
- [ ] Evaluate before 2.0 GA whether to fully remove or retain as an optional plugin.

