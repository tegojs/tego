import { Token } from '@tego/di';

import type { IEventBus } from './event-bus';
import type { Logger } from './logger';

/**
 * Service tokens for dependency injection.
 * These tokens are used to register and resolve services from the DI container.
 *
 * Core tokens are implemented by Tego itself.
 * Service tokens are typically implemented by plugins (e.g., @tego/module-standard-core).
 */
export const TOKENS = {
  // ============================================================================
  // Core Tokens (implemented by Tego core)
  // ============================================================================

  /**
   * The Tego instance itself
   */
  Tego: Token<any>('Tego'),

  /**
   * Event bus for application-wide events
   */
  EventBus: Token<IEventBus>('EventBus'),

  /**
   * Logger service (can be overridden by plugins)
   */
  Logger: Token<Logger>('Logger'),

  /**
   * Configuration object
   */
  Config: Token<any>('Config'),

  /**
   * Environment manager
   */
  Environment: Token<any>('Environment'),

  /**
   * Plugin manager
   */
  PluginManager: Token<any>('PluginManager'),

  // ============================================================================
  // Service Tokens (typically implemented by @tego/module-standard-core)
  // ============================================================================

  /**
   * Koa web server instance
   */
  KoaServer: Token<any>('KoaServer'),

  /**
   * HTTP/WebSocket Gateway
   */
  Gateway: Token<any>('Gateway'),

  /**
   * Database instance (main data source)
   */
  Database: Token<any>('Database'),

  /**
   * Data source manager (manages multiple data sources)
   */
  DataSourceManager: Token<any>('DataSourceManager'),

  /**
   * Main data source
   */
  MainDataSource: Token<any>('MainDataSource'),

  /**
   * Resource router (RESTful API)
   */
  Resourcer: Token<any>('Resourcer'),

  /**
   * Access Control List manager
   */
  ACL: Token<any>('ACL'),

  /**
   * Authentication manager
   */
  AuthManager: Token<any>('AuthManager'),

  /**
   * Cache manager
   */
  CacheManager: Token<any>('CacheManager'),

  /**
   * Cron job manager (scheduled tasks)
   */
  CronJobManager: Token<any>('CronJobManager'),

  /**
   * Pub/Sub manager (message queue)
   */
  PubSubManager: Token<any>('PubSubManager'),

  /**
   * Sync message manager (inter-process communication)
   */
  SyncMessageManager: Token<any>('SyncMessageManager'),

  /**
   * Notice manager (notifications)
   */
  NoticeManager: Token<any>('NoticeManager'),

  /**
   * AES encryptor utility
   */
  AesEncryptor: Token<any>('AesEncryptor'),

  /**
   * Application version manager
   */
  ApplicationVersion: Token<any>('ApplicationVersion'),

  /**
   * Locale/i18n manager
   */
  Locale: Token<any>('Locale'),

  /**
   * i18next instance
   */
  I18n: Token<any>('I18n'),
} as const;

/**
 * Type helper to extract token types
 */
export type TokenType<T extends keyof typeof TOKENS> = (typeof TOKENS)[T] extends Token<infer U> ? U : never;
