import { Collection, Model } from '@tachybase/database';

import jwt from 'jsonwebtoken';

import { Auth, AuthConfig, AuthError, AuthErrorCode } from '../auth';
import { JwtService } from './jwt-service';
import { ITokenControlService } from './token-control-service';

const localeNamespace = 'auth';

/**
 * 用户状态检查结果
 */
interface UserStatusCheckResult {
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
interface UserStatusCache {
  userId: number;
  status: string;
  expireAt: Date | null;
  previousStatus: string | null;
  lastChecked: Date;
}

/**
 * BaseAuth
 * @description A base class with jwt provide some common methods.
 */
export class BaseAuth extends Auth {
  protected userCollection: Collection;
  protected userStatusCollection: Collection;

  constructor(
    config: AuthConfig & {
      userCollection?: Collection;
      userStatusCollection?: Collection;
    },
  ) {
    const { userCollection, userStatusCollection } = config;
    super(config);
    this.userCollection = userCollection || this.ctx.db.getCollection('users');
    this.userStatusCollection = userStatusCollection || this.ctx.db.getCollection('userStatuses');
  }

  get userRepository() {
    return this.userCollection.repository;
  }

  get userStatusRepository() {
    return this.userStatusCollection.repository;
  }

  get jwt(): JwtService {
    return this.ctx.tego.authManager.jwt;
  }

  get tokenController(): ITokenControlService {
    return this.ctx.tego.authManager.tokenController;
  }

  set user(user: Model) {
    this.ctx.state.currentUser = user;
  }

  get user() {
    return this.ctx.state.currentUser;
  }

  getCacheKey(userId: number) {
    return `auth:${userId}`;
  }

  validateUsername(username: string) {
    return /^[^@.<>"'/]{2,16}$/.test(username);
  }

  async checkToken(): Promise<{
    tokenStatus: 'valid' | 'expired' | 'invalid';
    user: Awaited<ReturnType<Auth['check']>>;
    userStatus: string;
    jti?: string;
    temp: any;
    roleName?: any;
    signInTime?: number;
  }> {
    const token = this.ctx.getBearerToken();
    if (!token) {
      this.ctx.throw(401, {
        message: this.ctx.t('Unauthenticated. Please sign in to continue.', { ns: localeNamespace }),
        code: AuthErrorCode.EMPTY_TOKEN,
      });
    }

    let tokenStatus: 'valid' | 'expired' | 'invalid';
    let payload;
    try {
      payload = await this.jwt.decode(token);
      tokenStatus = 'valid';
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        tokenStatus = 'expired';
        payload = jwt.decode(token);
      } else {
        this.ctx.logger.error(err, { method: 'jwt.decode' });
        this.ctx.throw(401, {
          message: this.ctx.t('Your session has expired. Please sign in again.', { ns: localeNamespace }),
          code: AuthErrorCode.INVALID_TOKEN,
        });
      }
    }

    const { userId, userStatus = 'active', roleName, iat, temp, jti, exp, signInTime } = payload ?? {};

    const user = userId
      ? await this.ctx.tego.cache.wrap(this.getCacheKey(userId), () =>
          this.userRepository.findOne({
            filter: {
              id: userId,
            },
            raw: true,
          }),
        )
      : null;

    if (!user) {
      this.ctx.throw(401, {
        message: this.ctx.t('User not found. Please sign in again to continue.', { ns: localeNamespace }),
        code: AuthErrorCode.NOT_EXIST_USER,
      });
    }

    const statusCheckResult: UserStatusCheckResult = await this.checkUserStatus(user.id);
    if (!statusCheckResult.allowed) {
      this.ctx.throw(401, {
        message: this.ctx.t(
          statusCheckResult.statusInfo.loginErrorMessage ?? 'User status is invalid, please contact administrator',
          { ns: localeNamespace },
        ),
        code: AuthErrorCode.USER_STATUS_NOT_ALLOW_LOGIN,
      });
    }
    if (statusCheckResult.status !== userStatus) {
      this.ctx.throw(401, {
        message: this.ctx.t('Your account status has changed. Please sign in again.', { ns: localeNamespace }),
        code: AuthErrorCode.INVALID_TOKEN,
      });
    }

    if (roleName) {
      this.ctx.headers['x-role'] = roleName;
    }

    const blocked = await this.jwt.blacklist.has(jti ?? token);
    if (blocked) {
      this.ctx.throw(401, {
        message: this.ctx.t('Your session has expired. Please sign in again.', { ns: localeNamespace }),
        code: AuthErrorCode.BLOCKED_TOKEN,
      });
    }

    // api token check first
    if (!temp) {
      if (tokenStatus === 'valid') {
        return { tokenStatus, user, userStatus, temp };
      } else {
        this.ctx.throw(401, {
          message: this.ctx.t('Your session has expired. Please sign in again.', { ns: localeNamespace }),
          code: AuthErrorCode.INVALID_TOKEN,
        });
      }
    }

    const tokenPolicy = await this.tokenController.getConfig();

    // 这个sessionExpirationTime比如设为7天,则会在第7天立即出现重新登录,使用体验不好
    // if (signInTime && Date.now() - signInTime > tokenPolicy.sessionExpirationTime) {
    //   this.ctx.throw(401, {
    //     message: this.ctx.t('Your session has expired. Please sign in again.', { ns: localeNamespace }),
    //     code: AuthErrorCode.EXPIRED_SESSION,
    //   });
    // }

    if (tokenStatus === 'valid' && Date.now() - iat * 1000 > tokenPolicy.tokenExpirationTime) {
      tokenStatus = 'expired';
    }

    if (tokenStatus === 'valid' && user.passwordChangeTz && iat * 1000 < user.passwordChangeTz) {
      this.ctx.throw(401, {
        message: this.ctx.t('User password changed, please signin again.', { ns: localeNamespace }),
        code: AuthErrorCode.INVALID_TOKEN,
      });
    }

    if (tokenStatus === 'expired') {
      if (tokenPolicy.expiredTokenRenewLimit > 0 && Date.now() - exp * 1000 > tokenPolicy.expiredTokenRenewLimit) {
        this.ctx.throw(401, {
          message: this.ctx.t('Your session has expired. Please sign in again.', { ns: localeNamespace }),
          code: AuthErrorCode.EXPIRED_SESSION,
        });
      }

      this.ctx.logger.info('token renewing', {
        method: 'auth.check',
        url: this.ctx.originalUrl,
        currentJti: jti,
      });
      const isStreamRequest = this.ctx?.req?.headers?.accept === 'text/event-stream';

      if (isStreamRequest) {
        this.ctx.throw(401, {
          message: 'Stream api not allow renew token.',
          code: AuthErrorCode.SKIP_TOKEN_RENEW,
        });
      }

      if (!jti) {
        this.ctx.throw(401, {
          message: this.ctx.t('Your session has expired. Please sign in again.', { ns: localeNamespace }),
          code: AuthErrorCode.INVALID_TOKEN,
        });
      }
      return { tokenStatus, user, userStatus, jti, signInTime, temp };
    }

    return { tokenStatus, user, userStatus, jti, signInTime, temp };
  }

  async check(): ReturnType<Auth['check']> {
    const { tokenStatus, user, userStatus, jti, temp, signInTime, roleName } = await this.checkToken();

    if (tokenStatus === 'expired') {
      const tokenPolicy = await this.tokenController.getConfig();
      try {
        this.ctx.logger.info('token renewing', {
          method: 'auth.check',
          jti,
        });
        const isStreamRequest = this.ctx?.req?.headers?.accept === 'text/event-stream';

        if (isStreamRequest) {
          this.ctx.throw(401, {
            message: 'Stream api not allow renew token.',
            code: AuthErrorCode.SKIP_TOKEN_RENEW,
          });
        }

        if (!jti) {
          this.ctx.throw(401, {
            message: this.ctx.t('Your session has expired. Please sign in again.', { ns: localeNamespace }),
            code: AuthErrorCode.INVALID_TOKEN,
          });
        }

        const renewedResult = await this.tokenController.renew(jti);

        this.ctx.logger.info('token renewed', {
          method: 'auth.check',
          oldJti: jti,
          newJti: renewedResult.jti,
        });

        const expiresIn = Math.floor(tokenPolicy.tokenExpirationTime / 1000);
        const newToken = this.jwt.sign(
          { userId: user.id, userStatus, roleName, temp, signInTime, iat: Math.floor(renewedResult.issuedTime / 1000) },
          { jwtid: renewedResult.jti, expiresIn },
        );
        this.ctx.res.setHeader('x-new-token', newToken);
      } catch (err) {
        this.ctx.logger.error('token renew failed', {
          method: 'auth.check',
          jti,
        });
        const options =
          err instanceof AuthError
            ? { code: err.code, message: err.message }
            : { message: err.message, code: err.code ?? AuthErrorCode.INVALID_TOKEN };

        this.ctx.throw(401, {
          message: this.ctx.t(options.message, { ns: localeNamespace }),
          code: options.code,
        });
      }
    }

    return user;
  }

  async validate(): Promise<Model> {
    return null;
  }

  /**
   * 签 token
   * @param userId 用户 ID
   * @param jti 传入则续期旧 token, 不传入则签发新 token
   * @returns 新 token
   */
  async signNewToken(userId: number, jti?: string) {
    const user = await this.userRepository.findOne({
      filter: { id: userId },
      fields: ['id', 'status'],
    });
    if (!user) {
      this.ctx.throw(401, {
        message: this.ctx.t('User not found. Please sign in again to continue.', { ns: localeNamespace }),
        code: AuthErrorCode.NOT_EXIST_USER,
      });
    }
    const tokenInfo = await this.tokenController.add({ userId });
    const expiresIn = Math.floor((await this.tokenController.getConfig()).tokenExpirationTime / 1000);
    const token = this.jwt.sign(
      {
        userId,
        userStatus: user.status,
        temp: true,
        iat: Math.floor(tokenInfo.issuedTime / 1000),
        signInTime: tokenInfo.signInTime,
      },
      {
        jwtid: tokenInfo.jti,
        expiresIn,
      },
    );
    return token;
  }

  async signIn() {
    let user: Model;
    try {
      user = await this.validate();
    } catch (err) {
      this.ctx.throw(err.status || 401, err.message, {
        ...err,
      });
    }
    if (!user) {
      this.ctx.throw(401, {
        message: this.ctx.t('User not found. Please sign in again to continue.', { ns: localeNamespace }),
        code: AuthErrorCode.NOT_EXIST_USER,
      });
    }
    const statusCheckResult: UserStatusCheckResult = await this.checkUserStatus(user.id);
    if (!statusCheckResult.allowed) {
      this.ctx.throw(401, {
        message: this.ctx.t(statusCheckResult.statusInfo.loginErrorMessage, { ns: localeNamespace }),
        code: AuthErrorCode.USER_STATUS_NOT_ALLOW_LOGIN,
      });
    }
    const token = await this.signNewToken(user.id);
    return {
      user,
      token,
    };
  }

  async signOut(): Promise<any> {
    const token = this.ctx.getBearerToken();
    if (!token) {
      return;
    }
    let userId;
    try {
      const result = await this.jwt.decode(token);
      userId = result.userId;
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        this.ctx.throw(401, {
          message: this.ctx.t('Your session has expired. Please sign in again.', { ns: localeNamespace }),
          code: AuthErrorCode.INVALID_TOKEN,
        });
      } else {
        this.ctx.throw(401, {
          message: this.ctx.t('Invalid token. Please sign in again.', { ns: localeNamespace }),
          code: AuthErrorCode.INVALID_TOKEN,
        });
      }
    }
    await this.ctx.tego.emitAsync('cache:del:roles', { userId });
    await this.ctx.cache.del(this.getCacheKey(userId));
    return await this.jwt.block(token);
  }

  /**
   * 检查用户状态是否允许登录
   * @param userId 用户ID
   * @returns 检查结果
   */
  private async checkUserStatus(userId: number): Promise<UserStatusCheckResult> {
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
      const translatedLoginErrorMessage = translateMessage(statusInfo.loginErrorMessage);

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
        errorMessage: !statusInfo.allowLogin
          ? translatedLoginErrorMessage || this.ctx.t('User status does not allow login', { ns: localeNamespace })
          : undefined,
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

  /**
   * 设置用户状态缓存
   */
  private async setUserStatusCache(userId: number, data: UserStatusCache): Promise<void> {
    try {
      const cacheKey = this.getUserStatusCacheKey(userId);
      await this.ctx.tego.cache.set(cacheKey, JSON.stringify(data), 300 * 1000); // 5分钟过期
    } catch (error) {
      this.ctx.logger.error('Error setting user status cache:', error);
    }
  }

  /**
   * 从缓存获取用户状态
   */
  private async getUserStatusFromCache(userId: number): Promise<UserStatusCache | null> {
    try {
      const cacheKey = this.getUserStatusCacheKey(userId);
      const cached = await this.ctx.tego.cache.get(cacheKey);
      return cached ? (JSON.parse(cached as unknown as string) as UserStatusCache) : null;
    } catch (error) {
      this.ctx.logger.error('Error getting user status from cache:', error);
      return null;
    }
  }

  /**
   * 恢复过期的用户状态
   * @param userId 用户ID
   */
  private async restoreUserStatus(userId: number): Promise<void> {
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

  /**
   * 获取用户状态缓存键
   */
  private getUserStatusCacheKey(userId: number): string {
    return `userStatus:${userId}`;
  }

  /**
   * 记录状态变更历史（如果不存在相同记录）
   * @param params 状态变更参数
   */
  private async recordStatusHistoryIfNotExists(params: {
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
      const existing = await this.userStatusRepository.findOne({
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
      await this.userStatusRepository.create({
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

  /**
   * 清除用户状态缓存
   */
  private async clearUserStatusCache(userId: number): Promise<void> {
    try {
      const cacheKey = this.getUserStatusCacheKey(userId);
      await this.ctx.tego.cache.del(cacheKey);
    } catch (error) {
      this.ctx.logger.error('Error clearing user status cache:', error);
    }
  }
}
