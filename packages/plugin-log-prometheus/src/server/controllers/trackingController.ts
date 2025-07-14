import { Context, Next } from '@tachybase/actions';
import { Action, Controller } from '@tachybase/utils';

import { contentType } from 'prom-client';

import { TrackingFilter } from '../metrics/trackingFilter';
import { trackingMetricsUtils } from '../utils/tracking-metrics-utils';

@Controller('log-metrics')
export class TrackingController {
  private trackingFilter: TrackingFilter;

  setTrackingFilter(trackingFilter: TrackingFilter) {
    this.trackingFilter = trackingFilter;
  }

  @Action('getTrackingMetrics', { acl: 'public' })
  async getTrackingMetrics(ctx: Context, next: Next) {
    try {
      console.log('[TrackingController] 开始获取追踪指标...');
      const metrics = await trackingMetricsUtils.getTrackingMetrics();
      console.log('[TrackingController] 指标获取成功，长度:', metrics.length);
      // 设置响应类型和内容
      ctx.withoutDataWrapping = true;
      ctx.set('Content-Type', contentType);
      ctx.body = metrics;

      return next();
    } catch (error) {
      console.error('[TrackingController] 获取指标失败:', error);
      ctx.status = 500;
      ctx.set('Content-Type', 'text/plain; charset=utf-8');
      ctx.body = `# ERROR: ${error.message}`;
      return next();
    }
  }

  @Action('getTrackingMetricsAsJSON', { acl: 'public' })
  async getTrackingMetricsAsJSON(ctx: Context, next: Next) {
    try {
      const metrics = await trackingMetricsUtils.getTrackingMetricsAsJSON();
      ctx.body = {
        success: true,
        data: metrics,
        format: 'json',
      };
    } catch (error) {
      ctx.body = {
        success: false,
        error: error.message,
      };
    }
    return next();
  }

  @Action('getTrackingMetricsForPrometheus', { acl: 'public' })
  async getTrackingMetricsForPrometheus(ctx: Context, next: Next) {
    try {
      console.log('[TrackingController] 开始获取 Prometheus 格式指标...');
      const metrics = await trackingMetricsUtils.getTrackingMetrics();
      console.log('[TrackingController] Prometheus 指标获取成功，长度:', metrics.length);

      // 返回 JSON 格式，包含 Prometheus 文本格式的数据
      ctx.body = {
        success: true,
        data: metrics,
        format: 'prometheus-text',
        content_type: 'text/plain; charset=utf-8',
        timestamp: new Date().toISOString(),
      };

      console.log('[TrackingController] Prometheus JSON 响应已设置');
      return next();
    } catch (error) {
      console.error('[TrackingController] 获取 Prometheus 指标失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message,
        format: 'error',
        timestamp: new Date().toISOString(),
      };
      return next();
    }
  }

  @Action('resetTrackingMetrics', { acl: 'private' })
  async resetTrackingMetrics(ctx: Context, next: Next) {
    try {
      trackingMetricsUtils.resetTrackingMetrics();
      ctx.body = {
        success: true,
        message: '追踪指标已重置',
      };
    } catch (error) {
      ctx.body = {
        success: false,
        error: error.message,
      };
    }
    return next();
  }

  @Action('getTrackingConfigs', { acl: 'private' })
  async getTrackingConfigs(ctx: Context, next: Next) {
    try {
      if (!this.trackingFilter) {
        throw new Error('追踪过滤器未初始化');
      }

      const configs = this.trackingFilter.getEnabledConfigs();
      const totalConfigs = this.trackingFilter.trackingConfigs.length;
      const enabledConfigs = configs.length;

      // 更新配置计数指标
      trackingMetricsUtils.updateTrackingConfigCount(enabledConfigs, totalConfigs);

      ctx.body = {
        success: true,
        data: {
          configs,
          summary: {
            total: totalConfigs,
            enabled: enabledConfigs,
            disabled: totalConfigs - enabledConfigs,
          },
        },
      };
    } catch (error) {
      ctx.body = {
        success: false,
        error: error.message,
      };
    }
    return next();
  }

  @Action('getTrackingStats', { acl: 'private' })
  async getTrackingStats(ctx: Context, next: Next) {
    try {
      if (!this.trackingFilter) {
        throw new Error('追踪过滤器未初始化');
      }

      const configs = this.trackingFilter.getEnabledConfigs();
      const stats = {
        totalConfigs: configs.length,
        activeTracking: configs.filter((c) => c.enabled).length,
        metrics: await trackingMetricsUtils.getTrackingMetricsAsJSON(),
      };

      ctx.body = {
        success: true,
        data: stats,
      };
    } catch (error) {
      ctx.body = {
        success: false,
        error: error.message,
      };
    }
    return next();
  }

  @Action('createTrackingConfig', { acl: 'private' })
  async createTrackingConfig(ctx: Context, next: Next) {
    try {
      const { values } = ctx.action.params;
      const repo = ctx.db.getRepository('metricsConfig');

      const config = await repo.create({
        values: {
          ...values,
          enabled: values.enabled !== false,
        },
      });

      // 重新加载追踪过滤器
      await this.trackingFilter.load();

      ctx.body = {
        success: true,
        data: config,
      };
    } catch (error) {
      ctx.body = {
        success: false,
        error: error.message,
      };
    }
    return next();
  }

  @Action('updateTrackingConfig', { acl: 'private' })
  async updateTrackingConfig(ctx: Context, next: Next) {
    try {
      const { filter, values } = ctx.action.params;
      const repo = ctx.db.getRepository('metricsConfig');

      await repo.update({
        filter,
        values,
      });

      // 重新加载追踪过滤器
      await this.trackingFilter.load();

      ctx.body = {
        success: true,
        message: '追踪配置已更新',
      };
    } catch (error) {
      ctx.body = {
        success: false,
        error: error.message,
      };
    }
    return next();
  }

  @Action('deleteTrackingConfig', { acl: 'private' })
  async deleteTrackingConfig(ctx: Context, next: Next) {
    try {
      const { filter } = ctx.action.params;
      const repo = ctx.db.getRepository('metricsConfig');

      await repo.destroy({
        filter,
      });

      // 重新加载追踪过滤器
      await this.trackingFilter.load();

      ctx.body = {
        success: true,
        message: '追踪配置已删除',
      };
    } catch (error) {
      ctx.body = {
        success: false,
        error: error.message,
      };
    }
    return next();
  }
}
