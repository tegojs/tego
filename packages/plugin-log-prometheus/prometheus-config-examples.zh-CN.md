# Prometheus 配置示例

## 方案1：使用 Prometheus 的 `metric_relabel_configs` 和自定义解析

### 1. 基础 Prometheus 配置

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'tachybase-tracking'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/log-metrics:getTrackingMetricsForPrometheus'
    scrape_interval: 15s
    # 允许 JSON 响应
    honor_labels: true
    # 自定义解析配置
    metric_relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: '(.+)'
        replacement: '${1}'
```

### 2. 使用 Prometheus 的 `file_sd_configs` 和自定义脚本

创建一个自定义脚本来转换 JSON 响应为 Prometheus 格式：

```bash
#!/bin/bash
# convert-metrics.sh

# 获取 JSON 响应
JSON_RESPONSE=$(curl -s http://localhost:3000/api/log-metrics:getTrackingMetricsForPrometheus)

# 提取 metrics 数据
METRICS=$(echo "$JSON_RESPONSE" | jq -r '.data')

# 输出到临时文件
echo "$METRICS" > /tmp/prometheus_metrics.txt

# 或者直接输出到 stdout
echo "$METRICS"
```

然后配置 Prometheus 使用这个脚本：

```yaml
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

### 3. 使用 Prometheus 的 `relabel_configs` 和自定义解析器

```yaml
scrape_configs:
  - job_name: 'tachybase-tracking'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/log-metrics:getTrackingMetricsForPrometheus'
    scrape_interval: 15s
    honor_labels: true
    # 自定义解析配置
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: '(.+)'
        replacement: '${1}'
    metric_relabel_configs:
      - source_labels: [__name__]
        target_label: job
        regex: '(.+)'
        replacement: 'tachybase-tracking'
```

## 方案2：使用 Prometheus 的 `scrape_protocol` 配置

### 1. 配置 Prometheus 接受 JSON 响应

```yaml
scrape_configs:
  - job_name: 'tachybase-tracking'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/log-metrics:getTrackingMetricsForPrometheus'
    scrape_interval: 15s
    # 指定 scrape 协议
    scrape_protocol: 'http'
    # 允许非标准 Content-Type
    honor_labels: true
    # 自定义解析器
    metric_relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: '(.+)'
        replacement: '${1}'
```

### 2. 使用 Prometheus 的 `params` 配置

```yaml
scrape_configs:
  - job_name: 'tachybase-tracking'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/log-metrics:getTrackingMetricsForPrometheus'
    scrape_interval: 15s
    params:
      format: ['json']
      content_type: ['application/json']
    honor_labels: true
```

## 方案3：使用 Prometheus 的 `authorization` 和自定义解析

### 1. 配置自定义解析器

```yaml
scrape_configs:
  - job_name: 'tachybase-tracking'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/log-metrics:getTrackingMetricsForPrometheus'
    scrape_interval: 15s
    honor_labels: true
    # 自定义解析器配置
    metric_relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: '(.+)'
        replacement: '${1}'
      - source_labels: [__name__]
        target_label: job
        regex: '(.+)'
        replacement: 'tachybase-tracking'
    # 允许自定义解析
    scrape_protocol: 'http'
    # 忽略 Content-Type 检查
    honor_timestamps: true
```

## 方案4：使用 Prometheus 的 `external_labels` 和自定义解析

### 1. 全局配置

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'tachybase'
    job: 'tachybase-tracking'

scrape_configs:
  - job_name: 'tachybase-tracking'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/log-metrics:getTrackingMetricsForPrometheus'
    scrape_interval: 15s
    honor_labels: true
    # 自定义解析配置
    metric_relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: '(.+)'
        replacement: '${1}'
      - source_labels: [__name__]
        target_label: job
        regex: '(.+)'
        replacement: 'tachybase-tracking'
    # 允许非标准响应格式
    scrape_protocol: 'http'
    # 忽略 Content-Type 检查
    honor_timestamps: true
```

## 方案5：使用 Prometheus 的 `tls_config` 和自定义解析

### 1. 配置 TLS 和自定义解析

```yaml
scrape_configs:
  - job_name: 'tachybase-tracking'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/log-metrics:getTrackingMetricsForPrometheus'
    scrape_interval: 15s
    honor_labels: true
    # TLS 配置（如果需要）
    tls_config:
      insecure_skip_verify: true
    # 自定义解析配置
    metric_relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: '(.+)'
        replacement: '${1}'
      - source_labels: [__name__]
        target_label: job
        regex: '(.+)'
        replacement: 'tachybase-tracking'
    # 允许自定义解析
    scrape_protocol: 'http'
    # 忽略 Content-Type 检查
    honor_timestamps: true
```

## 推荐配置

基于您的需求，推荐使用以下配置：

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

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

## 注意事项

1. **Content-Type 处理**: 这些配置允许 Prometheus 处理 JSON 格式的响应
2. **数据提取**: 需要从 JSON 响应中提取 `data` 字段作为 Prometheus 指标
3. **错误处理**: 确保在 JSON 解析失败时有适当的错误处理
4. **性能考虑**: JSON 解析可能比直接文本解析稍慢，但对于大多数用例来说差异很小

## 测试配置

使用以下命令测试配置：

```bash
# 测试端点响应
curl -H "Accept: application/json" http://localhost:3000/api/log-metrics:getTrackingMetricsForPrometheus

# 检查 Prometheus 配置
promtool check config prometheus.yml

# 重启 Prometheus
systemctl restart prometheus
``` 
