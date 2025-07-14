# Plugin Log Metrics

基于 Prometheus 的用户登录指标监控插件，专为 Tachybase 应用设计。

## 功能特性

### 核心指标

1. **每日登录人次** (`tachybase_user_daily_login_count`)
   - 类型：Counter（计数器）
   - 标签：`date`（日期，格式：YYYY-MM-DD）
   - 说明：统计每日用户登录的总次数

2. **每日有效登录人数** (`tachybase_user_daily_active_users`)
   - 类型：Gauge（仪表盘）
   - 标签：`date`（日期，格式：YYYY-MM-DD）
   - 说明：统计每日实际登录的用户数量（去重）

3. **注册用户总数** (`tachybase_user_total_registered`)
   - 类型：Gauge（仪表盘）
   - 说明：统计系统中注册用户的总数

4. **登录成功次数** (`tachybase_user_login_success_total`)
   - 类型：Counter（计数器）
   - 标签：`user_id`（用户ID）、`method`（登录方式）
   - 说明：统计用户登录成功的次数

5. **登录失败次数** (`tachybase_user_login_failure_total`)
   - 类型：Counter（计数器）
   - 标签：`reason`（失败原因）、`method`（登录方式）
   - 说明：统计用户登录失败的次数

## API 端点

### 获取 Prometheus 格式指标
```
GET /log-metrics:getMetrics
```

返回 Prometheus 格式的指标数据，适合 Prometheus 服务器抓取。

### 获取 JSON 格式指标
```
GET /log-metrics:getMetricsAsJSON
```

返回 JSON 格式的指标数据，适合程序处理。

### 重置所有指标
```
POST /log-metrics:resetMetrics
```

重置所有指标数据。

## 使用方法

### 1. 自动集成

插件会自动集成到 Tachybase 应用中，无需额外配置。启用插件后，用户指标系统会自动：

- 初始化 Prometheus 指标收集
- 启动定期统计数据收集（每小时）
- 添加 HTTP 中间件自动记录登录指标
- 提供指标暴露端点

### 2. 手动记录指标

```typescript
import { userLoginMetrics } from '@tachybase/plugin-log-metrics';

// 记录用户登录成功
await userLoginMetrics.recordUserLogin('user123', 'password');

// 记录用户登录失败
await userLoginMetrics.recordUserLoginFailure('invalid_password', 'password');

// 更新每日活跃用户数
await userLoginMetrics.updateDailyActiveUsers(150);

// 更新注册用户总数
await userLoginMetrics.updateTotalRegisteredUsers(1000);
```

### 3. 在认证模块中集成

在用户登录成功的地方添加：

```typescript
// 登录成功后
if (loginSuccess) {
  await userLoginMetrics.recordUserLogin(user.id, loginMethod);
}
```

在登录失败的地方添加：

```typescript
// 登录失败后
if (loginFailed) {
  await userLoginMetrics.recordUserLoginFailure(failureReason, loginMethod);
}
```

### 4. 数据库集成

插件会自动从数据库获取用户统计数据：

- **每日活跃用户数**：查询 `users` 表中 `lastSignInAt` 字段在今日范围内的用户数量
- **注册用户总数**：查询 `users` 表中的总用户数量

确保用户表包含以下字段：
- `lastSignInAt`：用户最后登录时间（用于计算活跃用户）

## Prometheus 配置

在你的 Prometheus 配置文件中添加：

```yaml
scrape_configs:
  - job_name: 'tachybase-user-metrics'
    static_configs:
      - targets: ['localhost:3000']  # 你的应用地址
    metrics_path: '/log-metrics:getMetrics'
    scrape_interval: 15s
```

## 示例查询

### 获取今日登录人次
```
tachybase_user_daily_login_count{date="2024-01-15"}
```

### 获取今日活跃用户数
```
tachybase_user_daily_active_users{date="2024-01-15"}
```

### 获取注册用户总数
```
tachybase_user_total_registered
```

### 获取登录成功率
```
rate(tachybase_user_login_success_total[5m]) / (rate(tachybase_user_login_success_total[5m]) + rate(tachybase_user_login_failure_total[5m])) * 100
```

### 获取登录失败原因分布
```
tachybase_user_login_failure_total
```

## 配置选项

### 环境变量

- `NODE_ENV`：设置为 `development` 时启用详细日志记录

### 统计数据收集间隔

默认每小时收集一次统计数据，可以通过修改代码中的 `intervalMs` 参数调整：

```typescript
// 在 user-metrics.ts 中修改
start(intervalMs: number = 3600000) // 1小时 = 3600000毫秒
```

## 注意事项

1. **数据库依赖**：确保用户表包含 `lastSignInAt` 字段用于计算活跃用户
2. **指标持久化**：指标数据会在应用重启后重置，如需持久化请配置 Prometheus
3. **性能影响**：统计数据收集每小时执行一次，对性能影响很小
4. **错误处理**：所有指标操作都有完善的错误处理，不会影响主应用运行
5. **日志记录**：所有操作都有详细的日志记录，便于调试和监控

## 故障排除

### 指标数据不更新
1. 检查数据库连接是否正常
2. 确认用户表结构是否正确
3. 查看应用日志中的错误信息

### Prometheus 无法抓取指标
1. 确认指标端点 `/log-metrics:getMetrics` 可以访问
2. 检查 Prometheus 配置中的目标地址和路径
3. 验证网络连接和防火墙设置

### 登录指标不记录
1. 确认插件已正确启用
2. 检查登录请求是否匹配 `signIn` action
3. 查看应用日志中的指标记录信息
