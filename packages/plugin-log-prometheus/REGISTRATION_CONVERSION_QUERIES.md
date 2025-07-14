# 注册转化率 Prometheus 查询示例

本文档展示如何使用原始数据在 Prometheus 中计算注册转化率，用于评估注册流程的流畅性。

## 原始数据指标

### 1. 用户访问事件
```
tego_user_visit_total{session_id="session123", visit_date="2024-01-15", page_type="registration"}
```

### 2. 用户注册事件
```
tego_user_registration_total{user_id="user123", registration_date="2024-01-15"}
```

### 3. 注册流程步骤事件
```
tego_user_registration_step_total{session_id="session123", step_name="email_verification", step_date="2024-01-15", status="complete"}
```

### 4. 注册流程放弃事件
```
tego_user_registration_abandon_total{session_id="session123", abandon_step="email_verification", abandon_date="2024-01-15", reason="timeout"}
```

## 注册转化率计算查询

### 1. 基础注册转化率

#### 计算逻辑
- 分子：完成注册的用户数
- 分母：访问注册页面的用户数

#### Prometheus 查询
```promql
# 注册转化率（基于访问事件）
(
  count(
    tego_user_registration_total{registration_date="2024-01-15"}
  ) by (registration_date)
) / 
count(
  tego_user_visit_total{page_type="registration", visit_date="2024-01-15"}
) by (visit_date) * 100
```

### 2. 按步骤的转化率

```promql
# 邮箱验证步骤转化率
(
  count(
    tego_user_registration_step_total{step_name="email_verification", status="complete", step_date="2024-01-15"}
  ) by (step_date)
) / 
count(
  tego_user_registration_step_total{step_name="email_verification", status="start", step_date="2024-01-15"}
) by (step_date) * 100
```

### 3. 注册流程放弃率

```promql
# 注册流程放弃率
(
  count(
    tego_user_registration_abandon_total{abandon_date="2024-01-15"}
  ) by (abandon_date)
) / 
count(
  tego_user_visit_total{page_type="registration", visit_date="2024-01-15"}
) by (visit_date) * 100
```

### 4. 按放弃原因的分布

```promql
# 按原因分组的放弃率
(
  count(
    tego_user_registration_abandon_total{abandon_date="2024-01-15"}
  ) by (reason, abandon_date)
) / 
count(
  tego_user_visit_total{page_type="registration", visit_date="2024-01-15"}
) by (visit_date) * 100
```

## 动态日期查询

### 使用时间范围查询

```promql
# 最近7天的注册转化率趋势
(
  count(
    tego_user_registration_total[7d]
  ) by (registration_date)
) / 
count(
  tego_user_visit_total{page_type="registration"}[7d]
) by (visit_date) * 100
```

### 使用正则表达式匹配日期

```promql
# 本月注册转化率
(
  count(
    tego_user_registration_total{registration_date=~"2024-01-.*"}
  ) by (registration_date)
) / 
count(
  tego_user_visit_total{page_type="registration", visit_date=~"2024-01-.*"}
) by (visit_date) * 100
```

## 注册流程漏斗分析

### 1. 完整注册流程漏斗

```promql
# 步骤1：访问注册页面
count(
  tego_user_visit_total{page_type="registration", visit_date="2024-01-15"}
) by (visit_date)

# 步骤2：开始注册流程
count(
  tego_user_registration_step_total{step_name="start_registration", status="start", step_date="2024-01-15"}
) by (step_date)

# 步骤3：填写基本信息
count(
  tego_user_registration_step_total{step_name="basic_info", status="complete", step_date="2024-01-15"}
) by (step_date)

# 步骤4：邮箱验证
count(
  tego_user_registration_step_total{step_name="email_verification", status="complete", step_date="2024-01-15"}
) by (step_date)

# 步骤5：完成注册
count(
  tego_user_registration_total{registration_date="2024-01-15"}
) by (registration_date)
```

### 2. 各步骤转化率

```promql
# 从访问到开始注册的转化率
(
  count(
    tego_user_registration_step_total{step_name="start_registration", status="start", step_date="2024-01-15"}
  ) by (step_date)
) / 
count(
  tego_user_visit_total{page_type="registration", visit_date="2024-01-15"}
) by (visit_date) * 100

# 从开始注册到填写基本信息的转化率
(
  count(
    tego_user_registration_step_total{step_name="basic_info", status="complete", step_date="2024-01-15"}
  ) by (step_date)
) / 
count(
  tego_user_registration_step_total{step_name="start_registration", status="start", step_date="2024-01-15"}
) by (step_date) * 100

# 从填写基本信息到邮箱验证的转化率
(
  count(
    tego_user_registration_step_total{step_name="email_verification", status="complete", step_date="2024-01-15"}
  ) by (step_date)
) / 
count(
  tego_user_registration_step_total{step_name="basic_info", status="complete", step_date="2024-01-15"}
) by (step_date) * 100

# 从邮箱验证到完成注册的转化率
(
  count(
    tego_user_registration_total{registration_date="2024-01-15"}
  ) by (registration_date)
) / 
count(
  tego_user_registration_step_total{step_name="email_verification", status="complete", step_date="2024-01-15"}
) by (step_date) * 100
```

## Grafana 仪表板查询

### 1. 注册转化率趋势图

```promql
# 注册转化率趋势（最近30天）
(
  count(
    tego_user_registration_total{registration_date=~"2024-01-.*"}
  ) by (registration_date)
) / 
count(
  tego_user_visit_total{page_type="registration", visit_date=~"2024-01-.*"}
) by (visit_date) * 100
```

### 2. 注册流程漏斗图

```promql
# 漏斗各步骤数据
# 访问注册页面
count(
  tego_user_visit_total{page_type="registration", visit_date="2024-01-15"}
) by (visit_date)

# 开始注册
count(
  tego_user_registration_step_total{step_name="start_registration", status="start", step_date="2024-01-15"}
) by (step_date)

# 填写基本信息
count(
  tego_user_registration_step_total{step_name="basic_info", status="complete", step_date="2024-01-15"}
) by (step_date)

# 邮箱验证
count(
  tego_user_registration_step_total{step_name="email_verification", status="complete", step_date="2024-01-15"}
) by (step_date)

# 完成注册
count(
  tego_user_registration_total{registration_date="2024-01-15"}
) by (registration_date)
```

### 3. 放弃原因分析

```promql
# 按原因分组的放弃数量
count(
  tego_user_registration_abandon_total{abandon_date="2024-01-15"}
) by (reason, abandon_date)

# 放弃率趋势
(
  count(
    tego_user_registration_abandon_total{abandon_date=~"2024-01-.*"}
  ) by (reason, abandon_date)
) / 
count(
  tego_user_visit_total{page_type="registration", visit_date=~"2024-01-.*"}
) by (visit_date) * 100
```

## 高级查询技巧

### 1. 使用子查询优化性能

```promql
# 使用子查询计算转化率
(
  count(
    tego_user_registration_total{registration_date="2024-01-15"}
  ) by (registration_date)
) / 
count(
  tego_user_visit_total{page_type="registration", visit_date="2024-01-15"}
) by (visit_date) * 100
```

### 2. 按时间段分组

```promql
# 按小时分组的注册转化率
(
  count(
    tego_user_registration_total{registration_date="2024-01-15"}
  ) by (registration_date, hour)
) / 
count(
  tego_user_visit_total{page_type="registration", visit_date="2024-01-15"}
) by (visit_date, hour) * 100
```

### 3. 使用时间窗口函数

```promql
# 使用时间窗口计算滚动转化率
(
  count(
    tego_user_registration_total[7d]
  ) by (registration_date)
) / 
count(
  tego_user_visit_total{page_type="registration"}[7d]
) by (visit_date) * 100
```

## 注意事项

1. **数据延迟**：确保查询的日期范围有足够的数据
2. **性能优化**：对于大量数据的查询，建议使用时间范围限制
3. **标签匹配**：确保 `session_id` 和日期标签在所有指标中保持一致
4. **数据完整性**：确保所有注册流程事件都被正确记录

## 故障排除

### 查询返回空结果
1. 检查指标名称是否正确
2. 确认标签值是否存在
3. 验证时间范围是否合理

### 计算结果异常
1. 检查分子分母的计算逻辑
2. 确认 session_id 匹配是否正确
3. 验证日期格式是否一致

### 性能问题
1. 使用时间范围限制查询范围
2. 避免过于复杂的子查询
3. 考虑使用记录规则预计算常用指标 
