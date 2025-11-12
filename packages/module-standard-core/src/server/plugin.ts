import { Plugin } from '@tego/core';

/**
 * Standard Core Plugin
 *
 * This plugin will eventually contain all the standard services that are
 * currently in @tego/core. For Tego 2.0, services remain in core but are
 * accessible via DI container. Future versions will move service initialization
 * to this plugin.
 *
 * Services to be moved here:
 * - DataSourceManager
 * - Database
 * - Resourcer
 * - ACL
 * - AuthManager
 * - CacheManager
 * - I18n
 * - LocaleManager
 * - CronJobManager
 * - PubSubManager
 * - SyncMessageManager
 * - NoticeManager
 * - AesEncryptor
 */
export class StandardCorePlugin extends Plugin {
  getName(): string {
    return 'module-standard-core';
  }

  async beforeLoad() {
    // In future versions, services will be registered here
    // For now, services are initialized in Tego core and registered in DI
    this.tego.logger.info('StandardCorePlugin: beforeLoad');
  }

  async load() {
    // In future versions, service initialization will happen here
    // For now, this plugin serves as a placeholder and documentation
    this.tego.logger.info('StandardCorePlugin: load');

    // Verify that services are available in DI container
    this.verifyServices();
  }

  async install() {
    // One-time installation logic
    this.tego.logger.info('StandardCorePlugin: install');
  }

  /**
   * Verify that all expected services are registered in DI container
   * @internal
   */
  private verifyServices() {
    const { TOKENS } = require('@tego/core');
    const { container } = this.tego;

    const requiredServices = [
      'DataSourceManager',
      'CronJobManager',
      'I18n',
      'AuthManager',
      'PubSubManager',
      'SyncMessageManager',
      'NoticeManager',
    ];

    for (const serviceName of requiredServices) {
      if (TOKENS[serviceName] && container.has(TOKENS[serviceName])) {
        this.tego.logger.debug(`Service ${serviceName} is registered in DI container`);
      } else {
        this.tego.logger.warn(`Service ${serviceName} is not registered in DI container`);
      }
    }
  }
}
