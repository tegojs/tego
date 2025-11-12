/**
 * Standard Core Services
 *
 * This module exports all standard services that were previously in @tego/core
 * but are now provided by the module-standard-core plugin.
 */

// Database and Data Source
export * from './database-service';
export * from './datasource-service';

// Resource Management
export * from './resourcer-service';
export * from './acl-service';

// Authentication and Authorization
export * from './auth-service';

// Caching
export * from './cache-service';

// Internationalization
export * from './i18n-service';
export * from './locale-service';

// Background Jobs
export * from './cronjob-service';

// Messaging
export * from './pub-sub';
export * from './sync-message-service';
export * from './notice-service';

// Security
export * from './aes-encryptor-service';

// Web Server (Koa)
export * from './koa-service';
export * from './middleware-service';
