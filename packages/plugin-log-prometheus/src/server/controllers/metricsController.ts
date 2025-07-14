import { Context, Next } from '@tachybase/actions';
import { Action, Controller } from '@tachybase/utils';

import { metricsUtils } from '../metrics/user-metrics/metricsUtils';

@Controller('log-metrics')
export class MetricsController {
  // 获取 Prometheus 格式的指标数据
  @Action('getMetrics', { acl: 'public' })
  async getMetrics(ctx: Context, next: Next) {
    try {
      const metrics = await metricsUtils.getMetrics();
      // 设置响应类型和内容
      ctx.type = 'text/plain; charset=utf-8';
      ctx.body = metrics;
      return next();
    } catch (error) {
      console.error('Failed to get metrics:', error);
      ctx.status = 500;
      ctx.type = 'text/plain; charset=utf-8';
      ctx.body = `# ERROR: ${error.message}`;
      return next();
    }
  }

  // 获取 JSON 格式的指标数据
  @Action('getMetricsAsJSON', { acl: 'public' })
  async getMetricsAsJSON(ctx: Context, next: Next) {
    try {
      const metrics = await metricsUtils.getMetricsAsJSON();
      ctx.body = metrics;
    } catch (error) {
      console.error('Failed to get metrics as JSON:', error);
      ctx.status = 500;
      ctx.body = { error: 'Failed to get metrics as JSON' };
    }
    return next();
  }

  // 重置所有指标
  @Action('resetMetrics', { acl: 'public' })
  async resetMetrics(ctx: Context, next: Next) {
    try {
      metricsUtils.resetAllMetrics();
      ctx.body = { message: 'Metrics reset successfully' };
    } catch (error) {
      console.error('Failed to reset metrics:', error);
      ctx.status = 500;
      ctx.body = { error: 'Failed to reset metrics' };
    }
    return next();
  }
}
