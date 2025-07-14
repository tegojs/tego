import client from 'prom-client';

import { register } from '../register';

// 用户登录相关指标
export const userMetrics = {
  // 注册用户总数（仪表盘）
  totalRegisteredUsers: new client.Gauge({
    name: 'tego_user_total_registered',
    help: '注册用户总数',
    registers: [register],
  }),
  // 每日登录人次（计数器）
  dailyLoginCount: new client.Counter({
    name: 'tego_user_daily_login_count',
    help: '每日登录人次统计',
    labelNames: ['date'],
    registers: [register],
  }),

  // 每日有效登录人数（计数器）
  dailyActiveUsers: new client.Gauge({
    name: 'tego_user_daily_active_users',
    help: '每日有效登录人数统计',
    labelNames: ['date'],
    registers: [register],
  }),

  // 当前在线用户数（仪表盘）
  onlineUsers: new client.Gauge({
    name: 'tego_user_online_users',
    help: '当前在线用户数',
    registers: [register],
  }),

  // 登录成功总次数
  loginSuccessCount: new client.Counter({
    name: 'tego_user_login_success_total',
    help: '登录成功总次数',
    labelNames: ['user_id', 'method'],
    registers: [register],
  }),

  // 登录失败总次数
  loginFailureCount: new client.Counter({
    name: 'tego_user_login_failure_total',
    help: '登录失败总次数',
    labelNames: ['reason', 'method'],
    registers: [register],
  }),

  // 用户访问事件
  userVisit: new client.Counter({
    name: 'tego_user_visit_total',
    help: '用户访问总次数',
    labelNames: ['session_id', 'visit_date', 'page_type'],
    registers: [register],
  }),

  // 用户注册事件
  userRegistration: new client.Counter({
    name: 'tego_user_registration_total',
    help: '用户注册总次数',
    labelNames: ['user_id', 'registration_date'],
    registers: [register],
  }),

  // 注册流程步骤事件
  registrationStep: new client.Counter({
    name: 'tego_user_registration_step_total',
    help: '注册流程步骤总次数',
    labelNames: ['session_id', 'step_name', 'step_date', 'status'],
    registers: [register],
  }),

  // 注册流程放弃事件
  registrationAbandon: new client.Counter({
    name: 'tego_user_registration_abandon_total',
    help: '用户放弃注册总次数',
    labelNames: ['session_id', 'abandon_step', 'abandon_date', 'reason'],
    registers: [register],
  }),

  // 用户每日活跃事件
  userDailyActivity: new client.Counter({
    name: 'tego_user_daily_activity_total',
    help: '用户每日活跃事件总次数',
    labelNames: ['user_id', 'activity_date'],
    registers: [register],
  }),

  // 用户核心功能操作事件
  userCoreAction: new client.Counter({
    name: 'tego_user_core_action_total',
    help: '用户核心功能操作总次数',
    labelNames: ['user_id', 'action_date', 'action_type'],
    registers: [register],
  }),

  // 用户登录事件
  userLogin: new client.Counter({
    name: 'tego_user_login_event_total',
    help: '用户登录事件总次数',
    labelNames: ['user_id', 'login_date'],
    registers: [register],
  }),
};
