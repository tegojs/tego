import client from 'prom-client';

// 导出注册表 export
export const contentType = client.register.contentType;

// 创建 Prometheus 注册表
export const register = new client.Registry();
// 添加默认指标收集器
client.collectDefaultMetrics({
  register,
});
