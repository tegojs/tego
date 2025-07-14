import client from 'prom-client';

import { register } from './register';

// 追踪相关指标
export const trackingMetrics = {
  // 操作执行次数（按配置分组）
  actionExecutionCount: new client.Counter({
    name: 'tachybase_action_execution_total',
    help: '操作执行总次数',
    labelNames: ['config_title', 'resource_name', 'action_name', 'status'],
    registers: [register],
  }),

  // 操作执行时长（直方图）
  actionExecutionDuration: new client.Histogram({
    name: 'tachybase_action_execution_duration_seconds',
    help: '操作执行时长（秒）',
    labelNames: ['config_title', 'resource_name', 'action_name'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
    registers: [register],
  }),

  // 用户操作频率（按用户分组）
  userActionFrequency: new client.Counter({
    name: 'tachybase_user_action_total',
    help: '用户操作总次数',
    labelNames: ['user_id', 'config_title', 'resource_name', 'action_name'],
    registers: [register],
  }),

  // 错误操作次数
  errorActionCount: new client.Counter({
    name: 'tachybase_action_error_total',
    help: '操作错误总次数',
    labelNames: ['config_title', 'resource_name', 'action_name', 'error_type'],
    registers: [register],
  }),

  // 追踪配置数量
  trackingConfigCount: new client.Gauge({
    name: 'tachybase_tracking_config_total',
    help: '追踪配置总数',
    labelNames: ['status'],
    registers: [register],
  }),
};
