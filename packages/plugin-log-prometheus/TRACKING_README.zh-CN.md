# Plugin Log Metrics - 追踪功能

这个插件扩展了原有的用户指标功能，增加了操作追踪能力，将追踪数据作为 Prometheus metrics 提供给监控系统。

## 功能特性

### 1. 操作追踪
- 自动追踪配置的操作执行
- 记录操作执行次数、时长、错误等指标
- 支持按用户、资源、操作类型分组统计

### 2. Prometheus Metrics
提供以下 Prometheus 指标：

#### 操作执行指标
- `tachybase_action_execution_total` - 操作执行总次数
- `tachybase_action_execution_duration_seconds` - 操作执行时长（直方图）
- `tachybase_user_action_total` - 用户操作总次数
- `tachybase_action_error_total` - 操作错误总次数
- `tachybase_tracking_config_total` - 追踪配置总数

#### 用户指标（原有）
- `tachybase_user_daily_login_count` - 每日登录人次
- `tachybase_user_daily_active_users` - 每日活跃用户数
- `tachybase_user_total_registered` - 注册用户总数
- `tachybase_user_login_success_total` - 登录成功次数
- `tachybase_user_login_failure_total` - 登录失败次数

## API 接口

### 追踪指标接口
- `GET /api/log-metrics:getTrackingMetrics` - 获取 Prometheus 格式的追踪指标
- `GET /api/log-metrics:getTrackingMetricsAsJSON` - 获取 JSON 格式的追踪指标
- `POST /api/log-metrics:resetTrackingMetrics` - 重置追踪指标

### 追踪配置管理
- `GET /api/log-metrics:getTrackingConfigs` - 获取追踪配置列表
- `GET /api/log-metrics:getTrackingStats` - 获取追踪统计信息
- `POST /api/log-metrics:createTrackingConfig` - 创建追踪配置
- `POST /api/log-metrics:updateTrackingConfig` - 更新追踪配置
- `POST /api/log-metrics:deleteTrackingConfig` - 删除追踪配置

## 追踪配置

追踪配置存储在 `trackingConfig` 集合中，包含以下字段：

```typescript
{
  title: string;           // 配置标题
  resourceName: string;    // 资源名称
  action: string;          // 操作名称
  enabled: boolean;        // 是否启用
  trackingOptions: {
    meta: string[];        // 要记录的元数据字段
    payload: string[];     // 要记录的载荷字段
    filter?: object;       // 过滤条件
  };
}
```

### 默认配置
插件会自动创建默认的登录追踪配置：

```json
{
  "title": "sign-in",
  "resourceName": "auth",
  "action": "signIn",
  "enabled": true,
  "trackingOptions": {
    "meta": ["userId", "createdAt", "user-agent"],
    "payload": ["errors", "account", "phone"],
    "filter": {
      "$and": [
        {
          "payload": {
            "errors": {
              "$exists": false
            }
          }
        }
      ]
    }
  }
}
```

## 使用示例

### 1. 获取 Prometheus 指标
```bash
curl http://localhost:3000/api/log-metrics:getTrackingMetrics
```

### 2. 创建自定义追踪配置
```bash
curl -X POST http://localhost:3000/api/log-metrics:createTrackingConfig \
  -H "Content-Type: application/json" \
  -d '{
    "values": {
      "title": "user-create",
      "resourceName": "users",
      "action": "create",
      "enabled": true,
      "trackingOptions": {
        "meta": ["userId", "createdAt"],
        "payload": ["email", "nickname"],
        "filter": {}
      }
    }
  }'
```

### 3. 查看追踪统计
```bash
curl http://localhost:3000/api/log-metrics:getTrackingStats
```

## Prometheus 配置

### 方案1：直接使用 JSON 端点（推荐）

由于框架可能强制返回 JSON 格式，我们提供了专门的 JSON 端点：

```yaml
scrape_configs:
  - job_name: 'tachybase-tracking'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/log-metrics:getTrackingMetricsForPrometheus'
    scrape_interval: 15s
    honor_labels: true
    scrape_protocol: 'http'
    honor_timestamps: true
    metric_relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: '(.+)'
        replacement: '${1}'
      - source_labels: [__name__]
        target_label: job
        regex: '(.+)'
        replacement: 'tachybase-tracking'
```

### 方案2：使用转换脚本

如果 Prometheus 无法直接处理 JSON 响应，可以使用转换脚本：

1. **使用 Node.js 脚本**：
   ```bash
   # 直接运行转换脚本
   node convert-metrics.js
   
   # 在 Prometheus 配置中使用
   scrape_configs:
     - job_name: 'tachybase-tracking'
       static_configs:
         - targets: ['localhost:3000']
       metrics_path: '/tmp/prometheus_metrics.txt'
       file_sd_configs:
         - files:
           - '/tmp/prometheus_metrics.txt'
       scrape_interval: 15s
   ```

2. **使用 Shell 脚本**：
   ```bash
   # 给脚本执行权限
   chmod +x convert-metrics.sh
   
   # 运行转换脚本
   ./convert-metrics.sh
   
   # 设置定时任务更新指标文件
   */15 * * * * /path/to/convert-metrics.sh > /tmp/prometheus_metrics.txt
   ```

### 方案3：传统文本格式端点

如果您的环境支持，也可以使用传统的文本格式端点：

```yaml
scrape_configs:
  - job_name: 'tachybase-tracking'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/log-metrics:getTrackingMetrics'
    scrape_interval: 15s
```

**可用的端点**：
- `/api/log-metrics:getTrackingMetricsForPrometheus` - 返回 JSON 格式的 Prometheus 指标（推荐）
- `/api/log-metrics:getTrackingMetrics` - 返回文本格式的指标（可能被框架包装为 JSON）
- `/api/log-metrics:getMetrics` - 返回基础指标

## Grafana 仪表板

可以使用以下查询创建 Grafana 仪表板：

### 操作执行频率
```
rate(tachybase_action_execution_total[5m])
```

### 操作执行时长
```
histogram_quantile(0.95, rate(tachybase_action_execution_duration_seconds_bucket[5m]))
```

### 错误率
```
rate(tachybase_action_error_total[5m]) / rate(tachybase_action_execution_total[5m])
```

### 用户活跃度
```
tachybase_user_daily_active_users
```

## 注意事项

1. **性能影响**: 追踪功能会轻微影响 API 响应时间，建议只追踪重要的操作
2. **数据隐私**: 确保追踪配置不会记录敏感信息
3. **存储考虑**: Prometheus 指标会占用内存，定期清理历史数据
4. **多线程**: 追踪功能只在主线程初始化，避免重复配置

## 故障排除

### 常见问题

1. **指标不更新**
   - 检查追踪配置是否正确启用
   - 确认操作是否匹配配置的资源名和操作名

2. **权限错误**
   - 确保用户有访问追踪接口的权限
   - 检查 ACL 配置

3. **内存使用过高**
   - 减少追踪配置数量
   - 调整 Prometheus 抓取间隔
   - 定期重置指标

4. **Prometheus Content-Type 错误**
   - 错误信息: `Error scraping target: received unsupported Content-Type "application/json; charset=utf-8"`
   - 原因: 框架强制返回 JSON 格式，但 Prometheus 期望 `text/plain` 格式
   - 解决方案:
     - **方案1**: 使用专门的 JSON 端点 `/api/log-metrics:getTrackingMetricsForPrometheus`
     - **方案2**: 使用转换脚本 `node convert-metrics.js` 或 `./convert-metrics.sh`
     - **方案3**: 配置 Prometheus 接受 JSON 响应（参考 `prometheus-config-examples.md`）
   - 推荐使用方案1，因为它不需要修改框架代码

5. **HTTP 503 Service Unavailable 错误**
   - 错误信息: `Error scraping target: server returned HTTP status 503 Service Unavailable`
   - 可能原因:
     - 服务器未启动
     - 插件未启用
     - 端口配置错误
     - 服务器正在维护或重启
   - 解决方案:
     - 检查服务器状态: `pnpm tachybase status`
     - 启动服务器: `pnpm tachybase start`
     - 检查插件状态: `pnpm tachybase pm list`
     - 启用插件: `pnpm tachybase pm enable log-metrics`
     - 运行诊断脚本: `node check-server.js`

6. **HTTP Headers Sent 错误**
   - 错误信息: `Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client`
   - 原因: 响应头设置冲突
   - 解决方案: 已修复，使用标准的 `ctx.type` 和 `ctx.body` 设置响应

### 日志调试
启用详细日志：
```bash
DEBUG=plugin-log-metrics:* npm start
```

### 测试端点
运行测试脚本验证端点是否正常工作：
```bash
node test-metrics-endpoint.js
```

这个脚本会测试两个端点：
- `/api/log-metrics:getTrackingMetrics`
- `/api/log-metrics:getMetrics`

并验证它们返回正确的 Content-Type (`text/plain`)。

### 服务器状态检查
运行诊断脚本检查服务器状态：
```bash
node check-server.js
```

这个脚本会：
- 检查服务器端口是否开放
- 测试所有 metrics 端点
- 验证响应状态和 Content-Type
- 提供详细的诊断信息

### 转换脚本测试
测试 JSON 到 Prometheus 格式的转换：
```bash
# 测试 Node.js 转换脚本
node test-conversion.js

# 测试 Shell 转换脚本
chmod +x convert-metrics.sh
./convert-metrics.sh
```

这些脚本会：
- 获取 JSON 格式的指标数据
- 转换为 Prometheus 文本格式
- 验证转换结果的正确性 
