import { Context } from '@tachybase/actions';

import { TrackingFilter } from '../metrics/trackingFilter';
import { trackingMetricsUtils } from '../utils/tracking-metrics-utils';

// 数据过滤工具函数
function filterMatch(data: any, filter: Record<string, any>): boolean {
  if (!filter || Object.keys(filter).length === 0) {
    return true;
  }

  try {
    // 简单的过滤逻辑，可以根据需要扩展
    for (const [key, value] of Object.entries(filter)) {
      if (key === '$and' && Array.isArray(value)) {
        return value.every((condition) => filterMatch(data, condition));
      }
      if (key === '$or' && Array.isArray(value)) {
        return value.some((condition) => filterMatch(data, condition));
      }
      if (key === '$exists') {
        return value === (data !== undefined && data !== null);
      }
      if (data[key] !== value) {
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('[TrackingMiddleware] 过滤匹配失败:', error);
    return false;
  }
}

// 从嵌套对象中提取指定键的值
function findValuesByKeys(obj: any, keys: string[]): Record<string, any> {
  const result: Record<string, any> = {};

  const traverse = (current: any) => {
    if (typeof current !== 'object' || current === null) return;

    for (const [k, v] of Object.entries(current)) {
      if (keys.includes(k)) {
        result[k] = v;
      }
      traverse(v);
    }
  };

  traverse(obj);
  return result;
}

// 创建追踪中间件
export function createTrackingMiddleware(trackingFilter: TrackingFilter) {
  return async (ctx: Context, next: () => Promise<any>) => {
    const startTime = Date.now();
    let status: 'success' | 'error' = 'success';
    let errorType: string | undefined;

    try {
      // 执行原始操作
      await next();

      // 检查是否需要追踪
      if (ctx.action) {
        const { actionName, resourceName } = ctx.action;

        if (trackingFilter.check(resourceName, actionName)) {
          const config = trackingFilter.getConfig(resourceName, actionName);
          if (config) {
            await processTracking(ctx, config, startTime, status);
          }
        }
      }
    } catch (error) {
      status = 'error';
      errorType = error.constructor.name;

      // 即使出错也要尝试追踪
      if (ctx.action) {
        const { actionName, resourceName } = ctx.action;

        if (trackingFilter.check(resourceName, actionName)) {
          const config = trackingFilter.getConfig(resourceName, actionName);
          if (config) {
            await processTracking(ctx, config, startTime, status, errorType);
          }
        }
      }

      throw error;
    }
  };
}

// 处理追踪逻辑
async function processTracking(
  ctx: Context,
  config: any,
  startTime: number,
  status: 'success' | 'error',
  errorType?: string,
) {
  try {
    const duration = Date.now() - startTime;
    const userId = ctx.auth?.user?.id;
    const { actionName, resourceName, params } = ctx.action;
    const data = ctx.response?.body || null;

    // 提取配置的数据
    const configKeys = {
      meta: config.trackingOptions?.meta || [],
      payload: config.trackingOptions?.payload || [],
      filter: config.trackingOptions?.filter || {},
    };

    // 构建追踪数据
    const trackingData = {
      params,
      data,
      meta: {
        userId,
        createdAt: new Date().toISOString(),
        userAgent: ctx.req?.headers?.['user-agent'],
      },
    };

    // 检查过滤条件
    if (filterMatch(trackingData, configKeys.filter)) {
      // 记录到 Prometheus metrics
      trackingMetricsUtils.recordActionExecution(config, status, duration, userId, errorType);

      console.log(`[TrackingMiddleware] 记录操作追踪: ${config.title}, 状态: ${status}, 时长: ${duration}ms`);
    }
  } catch (error) {
    console.error('[TrackingMiddleware] 处理追踪失败:', error);
  }
}

// 初始化默认追踪配置
export async function initializeDefaultTrackingConfig(db: any) {
  try {
    const SignInTracking = await db.getRepository('metricsConfig').findOne({
      filter: {
        title: 'sign-in',
        resourceName: 'auth',
        action: 'signIn',
      },
    });

    if (!SignInTracking) {
      await db.getRepository('metricsConfig').create({
        values: {
          title: 'sign-in',
          resourceName: 'auth',
          action: 'signIn',
          enabled: true,
          trackingOptions: {
            meta: ['userId', 'createdAt', 'user-agent'],
            filter: {
              $and: [
                {
                  payload: {
                    errors: {
                      $exists: false,
                    },
                  },
                },
              ],
            },
            payload: ['errors', 'account', 'phone'],
          },
        },
      });
      console.log('[TrackingMiddleware] 已创建默认登录追踪配置');
    }
  } catch (error) {
    console.error('[TrackingMiddleware] 初始化默认追踪配置失败:', error);
  }
}
