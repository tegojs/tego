import { metricsUtils } from './metricsUtils';

/**
 * 初始化用户指标系统
 * @param db 数据库实例
 * @param autoStart 是否自动启动统计数据收集
 */
export async function initializeUserMetrics(db?: any, autoStart: boolean = true) {
  try {
    console.log('[UserMetrics] Initializing user metrics system...');

    const userMetrics = new UserLoginMetrics(db);
    const statsCollector = new UserStatsCollector(userMetrics);

    if (autoStart) {
      statsCollector.start();
    }

    console.log('[UserMetrics] User metrics system initialized successfully');

    return {
      userMetrics,
      statsCollector,
    };
  } catch (error) {
    console.error('[UserMetrics] Failed to initialize user metrics system:', error);
    throw error;
  }
}

/**
 * 用户登录指标管理类
 * 负责记录和管理用户登录相关的指标数据
 */
export class UserLoginMetrics {
  private db: any;

  constructor(db?: any) {
    this.db = db;
  }

  /**
   * 记录用户登录
   * @param userId 用户ID
   * @param method 登录方式
   */
  async recordUserLogin(userId: string, method: string = 'password') {
    try {
      metricsUtils.recordLoginSuccess(userId, method);

      // 记录用户登录事件（用于留存率计算）
      metricsUtils.recordUserLoginEvent(userId);

      // 记录用户每日活跃事件
      metricsUtils.recordUserDailyActivity(userId, new Date());

      console.log(`[UserMetrics] 记录用户登录: ${userId}, 方式: ${method}`);
    } catch (error) {
      console.error('[UserMetrics] 记录用户登录失败:', error);
    }
  }

  /**
   * 记录用户登录失败
   * @param reason 失败原因
   * @param method 登录方式
   */
  async recordUserLoginFailure(reason: string, method: string = 'password') {
    try {
      metricsUtils.recordLoginFailure(reason, method);
      console.log(`[UserMetrics] 记录登录失败: ${reason}, 方式: ${method}`);
    } catch (error) {
      console.error('[UserMetrics] 记录登录失败失败:', error);
    }
  }

  /**
   * 记录用户注册
   * @param userId 用户ID
   * @param registrationDate 注册日期
   */
  async recordUserRegistration(userId: string, registrationDate: Date) {
    try {
      metricsUtils.recordUserRegistration(userId, registrationDate);
      console.log(`[UserMetrics] 记录用户注册: ${userId}, 日期: ${registrationDate.toISOString()}`);
    } catch (error) {
      console.error('[UserMetrics] 记录用户注册失败:', error);
    }
  }

  /**
   * 记录用户核心功能操作
   * @param userId 用户ID
   * @param actionType 操作类型
   */
  async recordUserCoreAction(userId: string, actionType: string) {
    try {
      metricsUtils.recordUserCoreAction(userId, actionType);
      console.log(`[UserMetrics] 记录核心操作: ${userId}, 类型: ${actionType}`);
    } catch (error) {
      console.error('[UserMetrics] 记录核心操作失败:', error);
    }
  }

  /**
   * 更新每日活跃用户数
   * @param userId 活跃用户ID
   */
  async updateDailyActiveUsers(count: number) {
    try {
      metricsUtils.setDailyActiveUsers(count);
      console.log(`[UserMetrics] 更新每日活跃用户数: ${count}`);
    } catch (error) {
      console.error('[UserMetrics] 更新每日活跃用户数失败:', error);
    }
  }

  /**
   * 更新注册用户总数
   * @param count 用户总数
   */
  async updateTotalRegisteredUsers(count: number) {
    try {
      metricsUtils.setTotalRegisteredUsers(count);
      console.log(`[UserMetrics] 更新注册用户总数: ${count}`);
    } catch (error) {
      console.error('[UserMetrics] 更新注册用户总数失败:', error);
    }
  }

  /**
   * 从数据库获取每日活跃用户数
   */
  async getDailyActiveUsersFromDB(): Promise<number> {
    if (!this.db) {
      console.warn('[UserMetrics] 数据库未初始化，返回默认值');
      return 0;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // 查询今日登录的用户数量（去重）
      const activeUsers = await this.db.getRepository('users').count({
        filter: {
          lastSignInAt: {
            $gte: today.toISOString(),
            $lt: tomorrow.toISOString(),
          },
        },
      });

      console.log('%c Line:87 🍏 activeUsers', 'font-size:18px;color:#33a5ff;background:#465975', activeUsers);

      return activeUsers;
    } catch (error) {
      console.error('[UserMetrics] 获取每日活跃用户数失败:', error);
      return 0;
    }
  }

  /**
   * 从数据库获取注册用户总数
   */
  async getTotalRegisteredUsersFromDB(): Promise<number> {
    if (!this.db) {
      console.warn('[UserMetrics] 数据库未初始化，返回默认值');
      return 0;
    }

    try {
      const totalUsers = await this.db.getRepository('users').count();
      return totalUsers;
    } catch (error) {
      console.error('[UserMetrics] 获取注册用户总数失败:', error);
      return 0;
    }
  }
}

/**
 * 用户统计数据收集器
 * 定期从数据库收集用户统计数据并更新指标
 */
export class UserStatsCollector {
  private interval: NodeJS.Timeout | null = null;
  private userMetrics: UserLoginMetrics;
  private isRunning: boolean = false;

  constructor(userMetrics: UserLoginMetrics) {
    this.userMetrics = userMetrics;
  }

  /**
   * 启动统计数据收集
   * @param intervalMs 收集间隔（毫秒）
   */
  start(intervalMs: number = 3600000) {
    // 默认每小时收集一次
    if (this.isRunning) {
      console.warn('[UserStatsCollector] 统计数据收集器已在运行');
      return;
    }

    this.isRunning = true;
    this.interval = setInterval(async () => {
      await this.collectUserStats();
    }, intervalMs);

    console.log(`[UserStatsCollector] 用户统计数据收集器已启动，间隔: ${intervalMs / 1000 / 60} 分钟`);

    // 立即执行一次
    this.collectUserStats();
  }

  /**
   * 停止统计数据收集
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('[UserStatsCollector] 用户统计数据收集器已停止');
  }

  /**
   * 收集用户统计数据
   */
  private async collectUserStats() {
    try {
      console.log('[UserStatsCollector] 开始收集用户统计数据...');

      // 从数据库获取实际数据
      const dailyActiveUsers = await this.userMetrics.getDailyActiveUsersFromDB();
      const totalRegisteredUsers = await this.userMetrics.getTotalRegisteredUsersFromDB();

      // 更新指标
      await this.userMetrics.updateDailyActiveUsers(dailyActiveUsers);
      await this.userMetrics.updateTotalRegisteredUsers(totalRegisteredUsers);

      console.log(
        `[UserStatsCollector] 用户统计数据已更新: 活跃用户 ${dailyActiveUsers}, 注册用户 ${totalRegisteredUsers}`,
      );
    } catch (error) {
      console.error('[UserStatsCollector] 收集用户统计数据失败:', error);
    }
  }
}
