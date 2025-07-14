# 用户留存率指标说明

本插件采用原始数据采集方案，在 Prometheus 中聚合计算留存率，用于验证产品能否留住用户。

## 设计理念

**优势**：
- **更灵活** - 可以随时调整计算逻辑
- **更高效** - 减少应用层计算负担
- **更准确** - 利用 Prometheus 强大的查询能力
- **更易维护** - 计算逻辑集中在监控系统

## 原始数据指标

### 1. 用户注册事件
- `tego_user_registration_total` - 用户注册总次数
  - 标签：`user_id`, `registration_date`
  - 用于计算留存率的分母

### 2. 用户登录事件
- `tego_user_login_event_total` - 用户登录事件总次数
  - 标签：`user_id`, `login_date`
  - 用于计算留存率

### 3. 用户每日活跃事件
- `tego_user_daily_activity_total` - 用户每日活跃事件总次数
  - 标签：`user_id`, `activity_date`
  - 用于判断用户在特定日期是否活跃

### 4. 用户核心功能操作事件
- `tego_user_core_action_total` - 用户核心功能操作总次数
  - 标签：`user_id`, `action_type`, `action_date`
  - 用于验证用户不仅登录，还进行了核心操作

## 使用方法

### 1. 自动记录

插件会自动记录以下事件：

- **用户注册**：当检测到 `users` 资源的 `create` 操作时
- **用户登录**：当检测到 `signIn` 操作时
- **核心功能操作**：当检测到以下操作时：
  - 基础CRUD操作：`create`, `update`, `delete`
  - 数据操作：`export`, `import`
  - 工作流：`workflow`, `approval`
  - 文件操作：`upload`, `download`

### 2. 手动记录

```typescript
import { userLoginMetrics } from '@tachybase/plugin-log-metrics';

// 记录用户注册
await userLoginMetrics.recordUserRegistration('user123', new Date());

// 记录用户核心操作
await userLoginMetrics.recordUserCoreAction('user123', 'posts_create');
```

## Prometheus 查询示例

### 次日留存率计算

```promql
# 次日留存率（基于活跃事件）
(
  count(
    tego_user_daily_activity_total{activity_date="2024-01-16"}
  ) by (user_id)
  and on(user_id)
  count(
    tego_user_registration_total{registration_date="2024-01-15"}
  ) by (user_id)
) / 
count(
  tego_user_registration_total{registration_date="2024-01-15"}
) * 100
```

### 7日留存率计算

```promql
# 7日留存率
(
  count(
    tego_user_daily_activity_total{activity_date="2024-01-22"}
  ) by (user_id)
  and on(user_id)
  count(
    tego_user_registration_total{registration_date="2024-01-15"}
  ) by (user_id)
) / 
count(
  tego_user_registration_total{registration_date="2024-01-15"}
) * 100
```

### 30日留存率计算

```promql
# 30日留存率
(
  count(
    tego_user_daily_activity_total{activity_date="2024-02-14"}
  ) by (user_id)
  and on(user_id)
  count(
    tego_user_registration_total{registration_date="2024-01-15"}
  ) by (user_id)
) / 
count(
  tego_user_registration_total{registration_date="2024-01-15"}
) * 100
```

### 核心功能操作留存率

```promql
# 次日核心功能操作留存率
(
  count(
    tego_user_core_action_total{action_date="2024-01-16"}
  ) by (user_id)
  and on(user_id)
  count(
    tego_user_registration_total{registration_date="2024-01-15"}
  ) by (user_id)
) / 
count(
  tego_user_registration_total{registration_date="2024-01-15"}
) * 100
```

## Grafana 仪表板查询

### 留存率趋势图

```promql
# 次日留存率趋势（最近30天）
(
  count(
    tego_user_daily_activity_total{activity_date=~"2024-01-.*"}
  ) by (user_id, activity_date)
  and on(user_id)
  count(
    tego_user_registration_total{registration_date=~"2024-01-.*"}
  ) by (user_id, registration_date)
) / 
count(
  tego_user_registration_total{registration_date=~"2024-01-.*"}
) by (registration_date) * 100
```

### 用户活跃度分析

```promql
# 每日新增用户数
count(
  tego_user_registration_total
) by (registration_date)

# 每日活跃用户数
count(
  tego_user_daily_activity_total
) by (activity_date)

# 核心操作频率
rate(
  tego_user_core_action_total[5m]
) by (action_type)
```

## 数据库要求

确保用户表包含以下字段：

- `id` - 用户ID
- `createdAt` - 用户注册时间
- `lastSignInAt` - 用户最后登录时间

## 计算逻辑

### 留存率计算公式

```
留存率 = (留存用户数 / 新增用户数) × 100%
```

### 计算示例

假设 2024-01-15 新增了 100 个用户：

1. **次日留存率**：2024-01-16 有 30 个用户仍然活跃
   - 留存率 = (30 / 100) × 100% = 30%

2. **7日留存率**：2024-01-22 有 20 个用户仍然活跃
   - 留存率 = (20 / 100) × 100% = 20%

3. **30日留存率**：2024-02-14 有 10 个用户仍然活跃
   - 留存率 = (10 / 100) × 100% = 10%

## 配置选项

### 核心功能操作定义

可以在中间件中修改 `coreActions` 数组来自定义核心功能操作：

```typescript
const coreActions = [
  'create', 'update', 'delete', // 基础CRUD操作
  'export', 'import', // 数据导入导出
  'workflow', 'approval', // 工作流相关
  'upload', 'download', // 文件操作
  // 添加更多核心操作...
];
```

### 统计数据收集频率

默认每小时收集一次统计数据，可以通过修改 `UserStatsCollector` 的 `intervalMs` 参数调整：

```typescript
// 修改为每天收集一次
start(intervalMs: number = 86400000) // 24小时 = 86400000毫秒
```

## 注意事项

1. **数据延迟**：留存率计算需要等待相应时间窗口的数据，例如30日留存率需要等待30天后才能计算
2. **数据准确性**：确保用户表的 `createdAt` 和 `lastSignInAt` 字段准确记录
3. **性能考虑**：Prometheus 查询涉及大量数据，建议使用时间范围限制
4. **存储考虑**：原始事件数据会占用存储空间，建议配置 Prometheus 保留策略

## 故障排除

### 留存率计算为0
1. 检查原始事件数据是否正确记录
2. 确认 `user_id` 标签在所有指标中保持一致
3. 验证日期格式是否一致
4. 查看 Prometheus 查询语法是否正确

### 核心操作不记录
1. 确认操作名称是否在 `coreActions` 列表中
2. 检查用户是否已登录（`ctx.auth?.user?.id` 存在）
3. 确认操作状态为成功（`ctx.status === 200`）

### 指标数据不更新
1. 检查统计数据收集器是否正常运行
2. 确认数据库连接正常
3. 查看应用日志中的错误信息

### Prometheus 查询问题
1. 检查指标名称和标签是否正确
2. 确认时间范围是否合理
3. 验证查询语法是否符合 PromQL 规范
4. 参考 `PROMETHEUS_QUERIES.md` 文档获取更多查询示例 
