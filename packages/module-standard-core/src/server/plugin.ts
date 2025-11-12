import { Plugin } from '@tego/core';

import { registerACL, registerAdvancedLogger, registerCache, registerCron, registerPubSub } from './services';

/**
 * Standard Core Plugin
 *
 * This plugin provides all the standard services that were
 * previously in @tego/core. Services are now registered into the DI
 * container from here.
 */
export class StandardCorePlugin extends Plugin {
  getName(): string {
    return 'module-standard-core';
  }

  async beforeLoad() {
    registerAdvancedLogger(this.tego);
    registerACL(this.tego);
    await registerCache(this.tego, this.options.cacheManager ?? this.tego.options.cacheManager);
    registerCron(this.tego);
    registerPubSub(this.tego, this.options.pubSubManager ?? this.tego.options.pubSubManager);

    this.tego.logger.info('StandardCorePlugin: beforeLoad');
  }

  async load() {
    this.tego.logger.info('StandardCorePlugin: load');
    this.verifyServices();
  }

  async install() {
    this.tego.logger.info('StandardCorePlugin: install');
  }

  /**
   * Verify that all expected services are registered in DI container
   * @internal
   */
  private verifyServices() {
    const { TOKENS } = require('@tego/core');
    const { container } = this.tego;

    const requiredServices = ['Logger', 'ACL', 'CacheManager', 'CronJobManager', 'PubSubManager'];

    for (const serviceName of requiredServices) {
      if (TOKENS[serviceName] && container.has(TOKENS[serviceName])) {
        this.tego.logger.debug(`Service ${serviceName} is registered in DI container`);
      } else {
        this.tego.logger.warn(`Service ${serviceName} is not registered in DI container`);
      }
    }
  }
}
