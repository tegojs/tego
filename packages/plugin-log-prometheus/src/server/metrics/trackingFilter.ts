import Database, { Transaction } from '@tachybase/database';

export type TrackingConfig = {
  title: string;
  resourceName: string;
  action: string;
  trackingOptions: {
    meta: string[];
    payload: string[];
    filter?: Record<string, any>;
  };
  enabled: boolean;
};
// 追踪过滤器
export class TrackingFilter {
  db: Database;
  trackingConfigs: TrackingConfig[] = [];

  constructor(db: Database) {
    this.db = db;
    this.load().catch(console.error);
    this.addRefreshListener().catch(console.error);
  }

  // 从数据库加载追踪配置
  async load(transaction?: Transaction) {
    try {
      const configs = await this.db.getRepository('metricsConfig').find({ transaction });
      this.trackingConfigs = configs.map((config) => ({
        title: config.title,
        resourceName: config.resourceName,
        action: config.action,
        trackingOptions: config.trackingOptions || {
          meta: [],
          payload: [],
          filter: {},
        },
        enabled: config.enabled !== false,
      }));
    } catch (error) {
      console.error('[TrackingFilter] 加载追踪配置失败:', error);
    }
  }

  // 添加配置更新监听器
  async addRefreshListener() {
    this.db.on('metricsConfig.afterSave', async (model, options) => {
      await this.load(options.transaction);
    });
    this.db.on('metricsConfig.afterDestroy', async (model, options) => {
      await this.load(options.transaction);
    });
  }

  // 检查是否需要追踪某个操作
  check(resourceName: string, actionName: string): boolean {
    return this.trackingConfigs.some(
      (config) => config.enabled && config.resourceName === resourceName && config.action === actionName,
    );
  }

  // 获取指定操作的追踪配置
  getConfig(resourceName: string, actionName: string): TrackingConfig | undefined {
    return this.trackingConfigs.find(
      (config) => config.enabled && config.resourceName === resourceName && config.action === actionName,
    );
  }

  // 获取所有启用的配置
  getEnabledConfigs(): TrackingConfig[] {
    return this.trackingConfigs.filter((config) => config.enabled);
  }
}
