/**
 * Standard Core Services
 *
 * This module exports all standard services that were previously in @tego/core
 * but are now provided by the module-standard-core plugin.
 */

// Logger
export { registerAdvancedLogger } from './logger';

// Commands
export { registerCommands } from '../commands';

// ACL
export { registerACL } from './acl';

// Cache
export { registerCache } from './cache';

// Cron
export { registerCron } from './cron';

// PubSub
export { registerPubSub } from './pub-sub';

// Database and Data Source
export * from './database-service';
export * from './datasource-service';

// Resource Management
export * from './resourcer-service';

// Authentication and Authorization
export * from './auth-service';

// Internationalization
export * from './i18n-service';
export * from './locale-service';

// Messaging
export * from './sync-message-service';
export * from './notice-service';

// Security
export * from './aes-encryptor-service';

// Web Server (Koa)
export * from './koa-service';
export * from './middleware-service';
