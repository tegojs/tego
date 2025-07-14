# Prometheus 留存率查询示例

本文档展示如何使用原始数据在 Prometheus 中计算留存率。

## 原始数据指标

### 1. 用户注册事件
```
tego_user_registration_total{user_id="user123", registration_date="2024-01-15"}
```

### 2. 用户登录事件
```
tego_user_login_event_total{user_id="user123", login_date="2024-01-16"}
```

### 3. 用户每日活跃事件
```
tego_user_daily_activity_total{user_id="user123", activity_date="2024-01-16"}
```

### 4. 用户核心功能操作事件
```
tego_user_core_action_total{user_id="user123", action_type="posts_create", action_date="2024-01-16"}
```

## 留存率计算查询

### 1. 次日留存率

#### 计算逻辑
- 分子：在注册次日仍然活跃的用户数
- 分母：注册当日的用户数

#### Prometheus 查询
```promql
# 次日留存率（基于登录事件）
(
  count(
    tego_user_login_event_total{login_date="2024-01-16"}
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

#### 简化版本（使用活跃事件）
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

### 2. 7日留存率

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

### 3. 30日留存率

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

## 动态日期查询

### 使用时间偏移的动态查询

```promql
# 昨日次日留存率
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

### 使用时间范围查询

```promql
# 最近7天的次日留存率趋势
(
  count(
    tego_user_daily_activity_total[1d]
  ) by (user_id, activity_date)
  and on(user_id)
  count(
    tego_user_registration_total[1d]
  ) by (user_id, registration_date)
) / 
count(
  tego_user_registration_total[1d]
) by (registration_date) * 100
```

## 核心功能操作留存率

### 验证用户不仅登录，还进行了核心操作

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

### 按操作类型分析

```promql
# 按操作类型的次日留存率
(
  count(
    tego_user_core_action_total{action_date="2024-01-16"}
  ) by (user_id, action_type)
  and on(user_id)
  count(
    tego_user_registration_total{registration_date="2024-01-15"}
  ) by (user_id)
) / 
count(
  tego_user_registration_total{registration_date="2024-01-15"}
) by (action_type) * 100
```

## Grafana 仪表板查询

### 1. 留存率趋势图

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

### 2. 用户活跃度分析

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

### 3. 留存率对比图

```promql
# 次日留存率
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

# 7日留存率
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

# 30日留存率
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

## 高级查询技巧

### 1. 使用子查询优化性能

```promql
# 使用子查询计算留存率
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

### 2. 使用标签聚合

```promql
# 按用户类型分组计算留存率
(
  count(
    tego_user_daily_activity_total{activity_date="2024-01-16"}
  ) by (user_id, user_type)
  and on(user_id)
  count(
    tego_user_registration_total{registration_date="2024-01-15"}
  ) by (user_id, user_type)
) / 
count(
  tego_user_registration_total{registration_date="2024-01-15"}
) by (user_type) * 100
```

### 3. 使用时间窗口函数

```promql
# 使用时间窗口计算滚动留存率
(
  count(
    tego_user_daily_activity_total[7d]
  ) by (user_id)
  and on(user_id)
  count(
    tego_user_registration_total[7d]
  ) by (user_id)
) / 
count(
  tego_user_registration_total[7d]
) * 100
```

## 注意事项

1. **数据延迟**：确保查询的日期范围有足够的数据
2. **性能优化**：对于大量数据的查询，建议使用时间范围限制
3. **标签匹配**：确保 `user_id` 标签在所有指标中保持一致
4. **数据完整性**：确保所有用户事件都被正确记录

## 故障排除

### 查询返回空结果
1. 检查指标名称是否正确
2. 确认标签值是否存在
3. 验证时间范围是否合理

### 计算结果异常
1. 检查分子分母的计算逻辑
2. 确认用户ID匹配是否正确
3. 验证日期格式是否一致

### 性能问题
1. 使用时间范围限制查询范围
2. 避免过于复杂的子查询
3. 考虑使用记录规则预计算常用指标 
