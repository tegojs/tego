import { Context } from '@tachybase/actions';
import { Collection, Model } from '@tachybase/database';

/**
 * 用户状态检查结果
 */
export interface UserStatusCheckResult {
  allowed: boolean; // 是否允许登录
  status: string; // 当前状态 key
  statusInfo: {
    // 状态详细信息
    title: string;
    color: string;
    allowLogin: boolean;
  };
  errorMessage: string; // 不允许登录时的错误提示
  isExpired: boolean; // 状态是否已过期
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
