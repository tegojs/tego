/**
 * Standard Core Services
 *
 * This module exports all standard services that were previously in @tego/core
 * but are now provided by the module-standard-core plugin.
 */

import { registerCommands } from '../commands';
import { registerACL } from './acl';
import { registerAesEncryptor } from './aes-encryptor';
import { registerAppSupervisor } from './app-supervisor';
import { registerCache } from './cache';
import { registerCron } from './cron';
import { registerGateway } from './gateway/gateway';
import { registerAdvancedLogger } from './logger';
import { registerMiddlewares } from './middlewares';
import { registerNoticeManager } from './notice';
import { registerPubSub } from './pub-sub';
import { registerSyncMessageManager } from './sync-message-manager';

export {
  registerAdvancedLogger,
  registerCommands,
  registerACL,
  registerCache,
  registerCron,
  registerPubSub,
  registerAppSupervisor,
  registerGateway,
  registerMiddlewares,
  registerAesEncryptor,
  registerNoticeManager,
  registerSyncMessageManager,
};

export * from './database-service';
export * from './datasource-service';
export * from './resourcer-service';
export * from './auth-service';
export * from './i18n-service';
export * from './locale-service';
export * from './app-supervisor';
