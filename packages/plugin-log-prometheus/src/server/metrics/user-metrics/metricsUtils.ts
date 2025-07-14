import { formatDateTime } from '@tachybase/utils';

import { register } from '../register';
import { userMetrics } from './userMetrics';

// 工具函数
export const metricsUtils = {
  // 记录登录成功
  recordLoginSuccess(userId: string, method: string = 'password') {
    userMetrics.loginSuccessCount.inc({
      user_id: userId,
      method,
    });
    this.updateDailyLoginCount();
  },

  // 记录登录失败
  recordLoginFailure(reason: string, method: string = 'password') {
    userMetrics.loginFailureCount.inc({
      reason,
      method,
    });
  },

  // 更新每日登录人次
  updateDailyLoginCount() {
    const today = formatDateTime(new Date(), 'YYYY-MM-DD');
    userMetrics.dailyLoginCount.inc({
      date: today,
    });
  },

  // 设置每日有效登录用户数
  setDailyActiveUsers(count: number) {
    const today = formatDateTime(new Date(), 'YYYY-MM-DD');
    userMetrics.dailyActiveUsers.set({ date: today }, count);
  },

  // 设置注册用户总数
  setTotalRegisteredUsers(count: number) {
    userMetrics.totalRegisteredUsers.set(count);
  },

  // 记录用户访问事件
  recordUserVisit(sessionId: string, pageType: string, visitDate?: Date) {
    const date = visitDate ? formatDateTime(visitDate, 'YYYY-MM-DD') : formatDateTime(new Date(), 'YYYY-MM-DD');
    userMetrics.userVisit.inc({
      session_id: sessionId,
      visit_date: date,
      page_type: pageType,
    });
  },

  // 记录用户注册事件
  recordUserRegistration(userId: string, registrationDate: Date) {
    const date = formatDateTime(registrationDate, 'YYYY-MM-DD');
    userMetrics.userRegistration.inc({
      user_id: userId,
      registration_date: date,
    });

    console.log(`[UserMetrics] 记录用户注册事件: ${userId}, 日期: ${date}`);
  },

  // 记录注册流程步骤
  recordRegistrationStep(sessionId: string, stepName: string, status: 'start' | 'complete' | 'error', stepDate?: Date) {
    const date = stepDate ? formatDateTime(stepDate, 'YYYY-MM-DD') : formatDateTime(new Date(), 'YYYY-MM-DD');
    userMetrics.registrationStep.inc({
      session_id: sessionId,
      step_name: stepName,
      step_date: date,
      status,
    });
  },

  // 记录注册流程放弃
  recordRegistrationAbandon(sessionId: string, abandonStep: string, reason: string, abandonDate?: Date) {
    const date = abandonDate ? formatDateTime(abandonDate, 'YYYY-MM-DD') : formatDateTime(new Date(), 'YYYY-MM-DD');
    userMetrics.registrationAbandon.inc({
      session_id: sessionId,
      abandon_step: abandonStep,
      abandon_date: date,
      reason,
    });
  },

  // 记录用户每日活跃事件
  recordUserDailyActivity(userId: string, activityDate: Date) {
    const date = formatDateTime(activityDate, 'YYYY-MM-DD');
    userMetrics.userDailyActivity.inc({
      user_id: userId,
      activity_date: date,
    });
  },

  // 记录用户核心功能操作事件
  recordUserCoreAction(userId: string, actionType: string, actionDate?: Date) {
    const date = actionDate ? formatDateTime(actionDate, 'YYYY-MM-DD') : formatDateTime(new Date(), 'YYYY-MM-DD');
    userMetrics.userCoreAction.inc({
      user_id: userId,
      action_type: actionType,
      action_date: date,
    });
  },

  // 记录用户登录事件
  recordUserLoginEvent(userId: string, loginDate?: Date) {
    const date = loginDate ? formatDateTime(loginDate, 'YYYY-MM-DD') : formatDateTime(new Date(), 'YYYY-MM-DD');
    userMetrics.userLogin.inc({
      user_id: userId,
      login_date: date,
    });
  },

  // 获取指标数据
  async getMetrics(): Promise<string> {
    return await register.metrics();
  },

  // 获取 JSON 格式的指标数据
  async getMetricsAsJSON(): Promise<any> {
    return await register.getMetricsAsJSON();
  },

  // 重置所有指标
  resetAllMetrics(): void {
    register.clear();
  },
};
