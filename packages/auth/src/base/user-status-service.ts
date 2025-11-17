import { Context } from '@tachybase/actions';
import { Collection, Model } from '@tachybase/database';

/**
 * 用户状态检查结果
 */
export interface UserStatusCheckResult {
  allowed: boolean; // 是否允许登录
  status: string; // 当前状态 key
  statusInfo?: {
    // 状态详细信息
    title: string;
    color: string;
    allowLogin: boolean;
    loginErrorMessage?: string;
  };
  errorMessage?: string; // 不允许登录时的错误提示
  isExpired?: boolean; // 状态是否已过期
}

/**
 * 用户状态缓存数据
 */
export interface UserStatusCache {
  userId: number;
  status: string;
  expireAt: Date | null;
  previousStatus: string | null;
  lastChecked: Date;
}

/**
 * 用户状态服务接口
 */
export interface IUserStatusService {
  /**
   * 设置当前用户
   */
  setUser(user: Model): void;

  /**
   * 获取当前用户
   */
  getUser(): Model | undefined;

  /**
   * 检查用户状态是否允许登录
   * @param userId 用户ID
   * @returns 检查结果
   */
  checkUserStatus(userId: number): Promise<UserStatusCheckResult>;

  /**
   * 设置用户状态缓存
   * @param userId 用户ID
   * @param data 缓存数据
   */
  setUserStatusCache(userId: number, data: UserStatusCache): Promise<void>;

  /**
   * 从缓存获取用户状态
   * @param userId 用户ID
   * @returns 缓存数据或 null
   */
  getUserStatusFromCache(userId: number): Promise<UserStatusCache | null>;

  /**
   * 获取用户状态缓存键
   * @param userId 用户ID
   * @returns 缓存键
   */
  getUserStatusCacheKey(userId: number): string;

  /**
   * 恢复过期的用户状态
   * @param userId 用户ID
   */
  restoreUserStatus(userId: number): Promise<void>;

  /**
   * 清除用户状态缓存
   * @param userId 用户ID
   */
  clearUserStatusCache(userId: number): Promise<void>;

  /**
   * 记录状态变更历史（如果不存在相同记录）
   * @param params 状态变更参数
   */
  recordStatusHistoryIfNotExists(params: {
    userId: number;
    fromStatus: string;
    toStatus: string;
    reason: string | null;
    expireAt: Date | null;
    operationType: 'manual' | 'auto' | 'system';
    createdBy: number | null;
    transaction?: any;
  }): Promise<void>;
}

const localeNamespace = 'auth';

/**
 * 基础用户状态服务实现
 */
export class BaseUserStatusService implements IUserStatusService {
  constructor(
    protected ctx: Context,
    protected userCollection: Collection,
    protected userStatusCollection: Collection,
    protected userStatusHistoryCollection: Collection,
  ) {}

  get userRepository() {
    return this.userCollection.repository;
  }

  get userStatusRepository() {
    return this.userStatusCollection.repository;
  }

  get userStatusHistoryRepository() {
    return this.userStatusHistoryCollection.repository;
  }

  setUser(user: Model): void {
    this.ctx.state.currentUser = user;
  }

  getUser(): Model | undefined {
    return this.ctx.state.currentUser;
  }

  async checkUserStatus(userId: number): Promise<UserStatusCheckResult> {
    try {
      // 步骤1: 尝试从缓存获取
      let cached = await this.getUserStatusFromCache(userId);

      // 步骤2: 缓存不存在,从数据库查询
      if (!cached) {
        const user = await this.userRepository.findOne({
          filter: { id: userId },
          fields: ['id', 'status', 'statusExpireAt', 'previousStatus'],
        });

        if (!user) {
          return {
            allowed: false,
            status: 'unknown',
            errorMessage: this.ctx.t('User not found. Please sign in again to continue.', { ns: localeNamespace }),
          };
        }

        // 构建缓存数据
        cached = {
          userId: user.id,
          status: user.status || 'active',
          expireAt: user.statusExpireAt,
          previousStatus: user.previousStatus,
          lastChecked: new Date(),
        };

        // 写入缓存
        await this.setUserStatusCache(userId, cached);
      }

      // 步骤3: 检查状态是否过期
      if (cached.expireAt && new Date(cached.expireAt) <= new Date()) {
        // 状态已过期,自动恢复
        await this.restoreUserStatus(userId);

        // 重新获取恢复后的状态
        const user = await this.userRepository.findOne({
          filter: { id: userId },
          fields: ['status'],
        });

        cached.status = user.status || 'active';
        cached.expireAt = null;
        cached.previousStatus = null;

        // 更新缓存
        await this.setUserStatusCache(userId, cached);
      }

      // 步骤4: 查询状态定义
      const statusInfo = await this.userStatusRepository.findOne({
        filter: { key: cached.status },
      });

      if (!statusInfo) {
        this.ctx.logger.warn(`Status definition not found: ${cached.status}`);
        // 状态定义不存在,阻止登录(状态异常)
        return {
          allowed: false,
          status: cached.status,
          statusInfo: {
            title: this.ctx.t('Invalid status', { ns: localeNamespace }),
            color: 'red',
            allowLogin: false,
            loginErrorMessage: this.ctx.t('User status is invalid, please contact administrator', {
              ns: localeNamespace,
            }),
          },
          errorMessage: this.ctx.t('User status is invalid, please contact administrator', { ns: localeNamespace }),
        };
      }

      // 步骤5: 翻译 title 和 loginErrorMessage
      // 数据库中存储的是 {{t("...")}} 格式，需要解析并翻译
      const translateMessage = (message: string): string => {
        if (!message) return '';

        // 匹配 {{t("...")}} 格式
        const match = message.match(/\{\{t\("([^"]+)"\)\}\}/);
        if (match && match[1]) {
          return this.ctx.t(match[1], { ns: localeNamespace });
        }

        // 如果不是模板格式，直接返回
        return message;
      };

      const translatedTitle = translateMessage(statusInfo.title);
      const translatedLoginErrorMessage =
        translateMessage(statusInfo.loginErrorMessage) ||
        this.ctx.t('User status does not allow login', { ns: localeNamespace });

      // 步骤6: 返回检查结果
      return {
        allowed: statusInfo.allowLogin,
        status: cached.status,
        statusInfo: {
          title: translatedTitle,
          color: statusInfo.color,
          allowLogin: statusInfo.allowLogin,
          loginErrorMessage: translatedLoginErrorMessage,
        },
        errorMessage: !statusInfo.allowLogin ? translatedLoginErrorMessage : undefined,
      };
    } catch (error) {
      this.ctx.logger.error(`Error checking user status for userId=${userId}: ${error}`);
      // 安全起见, 发生错误时阻止登录
      return {
        allowed: false,
        status: 'unknown',
        statusInfo: {
          title: this.ctx.t('Unknown status', { ns: localeNamespace }),
          color: 'red',
          allowLogin: false,
          loginErrorMessage: this.ctx.t('System error, please contact administrator', { ns: localeNamespace }),
        },
        errorMessage: this.ctx.t('System error, please contact administrator', { ns: localeNamespace }),
      };
    }
  }

  async setUserStatusCache(userId: number, data: UserStatusCache): Promise<void> {
    try {
      const cacheKey = this.getUserStatusCacheKey(userId);
      await this.ctx.tego.cache.set(cacheKey, JSON.stringify(data), 300 * 1000); // 5分钟过期
    } catch (error) {
      this.ctx.logger.error('Error setting user status cache:', error);
    }
  }

  async getUserStatusFromCache(userId: number): Promise<UserStatusCache | null> {
    try {
      const cacheKey = this.getUserStatusCacheKey(userId);
      const cached = await this.ctx.tego.cache.get(cacheKey);
      return cached ? (JSON.parse(cached as unknown as string) as UserStatusCache) : null;
    } catch (error) {
      this.ctx.logger.error('Error getting user status from cache:', error);
      return null;
    }
  }

  getUserStatusCacheKey(userId: number): string {
    return `userStatus:${userId}`;
  }

  async restoreUserStatus(userId: number): Promise<void> {
    try {
      // 步骤1: 查询用户信息
      const user = await this.userRepository.findOne({
        filter: { id: userId },
        fields: ['id', 'status', 'statusExpireAt', 'previousStatus'],
      });

      if (!user) {
        throw new Error(this.ctx.t('User not found. Please sign in again to continue.', { ns: localeNamespace }));
      }

      // 步骤2: 检查是否需要恢复
      if (!user.statusExpireAt || new Date(user.statusExpireAt) > new Date()) {
        // 未过期或没有设置过期时间
        return;
      }

      const oldStatus = user.status;
      const restoreToStatus = user.previousStatus || 'active'; // 默认恢复为 active

      // 步骤3: 开启事务执行恢复
      await this.ctx.tego.db.sequelize.transaction(async (transaction) => {
        // 先插入历史记录, 不然会被记录为手动
        await this.recordStatusHistoryIfNotExists({
          userId: userId,
          fromStatus: oldStatus,
          toStatus: restoreToStatus,
          reason: this.ctx.t('Status expired, auto restored', { ns: localeNamespace }),
          operationType: 'auto',
          createdBy: null,
          expireAt: null,
          transaction,
        });
        // 更新 users 表
        await this.userRepository.update({
          filter: { id: userId },
          values: {
            status: restoreToStatus,
            statusExpireAt: null,
            previousStatus: null,
            statusReason: this.ctx.t('Status expired, auto restored', { ns: localeNamespace }),
          },
          transaction,
        });
      });

      // 步骤4: 触发事件
      this.ctx.tego.emitAsync('user:statusRestored', {
        userId,
        fromStatus: oldStatus,
        toStatus: restoreToStatus,
      });

      // 步骤6: 记录日志
      this.ctx.logger.info(`User status auto restored: userId=${userId}, ${oldStatus} → ${restoreToStatus}`);
    } catch (error) {
      this.ctx.logger.error('Error restoring user status:', error);
      throw error;
    }
  }

  async clearUserStatusCache(userId: number): Promise<void> {
    try {
      const cacheKey = this.getUserStatusCacheKey(userId);
      await this.ctx.tego.cache.del(cacheKey);
    } catch (error) {
      this.ctx.logger.error('Error clearing user status cache:', error);
    }
  }

  async recordStatusHistoryIfNotExists(params: {
    userId: number;
    fromStatus: string;
    toStatus: string;
    reason: string | null;
    expireAt: Date | null;
    operationType: 'manual' | 'auto' | 'system';
    createdBy: number | null;
    transaction?: any;
  }): Promise<void> {
    const { userId, fromStatus, toStatus, reason, expireAt, operationType, createdBy, transaction } = params;

    try {
      // 查询是否已存在相同的记录（最近5秒内）
      const fiveSecondsAgo = new Date(Date.now() - 5000);
      const existing = await this.userStatusHistoryRepository.findOne({
        filter: {
          userId,
          fromStatus,
          toStatus,
          createdAt: {
            $gte: fiveSecondsAgo,
          },
        },
        sort: ['-createdAt'],
        transaction,
      });

      // 如果最近5秒内有相同记录，跳过插入
      if (existing) {
        this.ctx.logger.warn(
          `Skipping duplicate history record: userId=${userId}, ${fromStatus} → ${toStatus}, operationType=${operationType}`,
        );
        return;
      }

      // 插入历史记录
      await this.userStatusHistoryRepository.create({
        values: {
          userId,
          fromStatus,
          toStatus,
          reason,
          expireAt,
          operationType,
          createdBy,
        },
        transaction,
      });

      this.ctx.logger.debug(
        `History recorded: userId=${userId}, ${fromStatus} → ${toStatus}, operationType=${operationType}`,
      );

      // 清除用户状态缓存（仅在成功插入记录后）
      await this.clearUserStatusCache(userId);
      this.ctx.logger.debug(`Cache cleared for userId=${userId}`);
    } catch (error) {
      this.ctx.logger.error('Failed to record status history:', error);
      throw error;
    }
  }
}
