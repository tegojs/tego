import { Transactionable } from '@tachybase/database';

import Application from './application';
import { PubSubCallback, PubSubManager, PubSubManagerPublishOptions } from './pub-sub-manager';

export class SyncMessageManager {
  protected versionManager: SyncMessageVersionManager;
  // protected pubSubManager: PubSubManager;

  constructor(
    protected app: Application,
    protected options: any = {},
  ) {
    this.versionManager = new SyncMessageVersionManager();
    app.on('beforeLoadPlugin', async (plugin) => {
      if (!plugin.name) {
        return;
      }
      await this.subscribe(plugin.name, plugin.handleSyncMessage, plugin);
    });

    app.on('beforeStop', async () => {
      const promises = [];
      for (const [P, plugin] of app.pm.getPlugins()) {
        if (!plugin.name) {
          continue;
        }
        promises.push(this.unsubscribe(plugin.name, plugin.handleSyncMessage));
      }
      await Promise.all(promises);
    });
  }

  get debounce() {
    // 内存级adapter,debounce可以为0
    let defaultDebounce;
    // TODO: 应该在初始化的地方get,set
    if (this.app.pubSubManager.adapter.constructor.name === 'MemoryPubSubAdapter') {
      defaultDebounce = 0;
    } else {
      defaultDebounce = 1_000;
    }
    return this.options.debounce || defaultDebounce;
  }

  async publish(channel: string, message, options?: PubSubManagerPublishOptions & Transactionable) {
    const { transaction, ...others } = options || {};
    if (transaction) {
      return await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(
            new Error(
              `Publish message to ${channel} timeout, channel: ${channel}, message: ${JSON.stringify(message)}`,
            ),
          );
        }, 50000);

        transaction.afterCommit(async () => {
          try {
            const r = await this.app.pubSubManager.publish(`${this.app.name}.sync.${channel}`, message, {
              skipSelf: true,
              ...others,
            });

            resolve(r);
          } catch (error) {
            reject(error);
          } finally {
            clearTimeout(timer);
          }
        });
      });
    } else {
      return await this.app.pubSubManager.publish(`${this.app.name}.sync.${channel}`, message, {
        skipSelf: true,
        ...options,
      });
    }
  }

  async subscribe(channel: string, callback: PubSubCallback, callbackCaller: any) {
    return await this.app.pubSubManager.subscribe(`${this.app.name}.sync.${channel}`, callback, {
      debounce: this.debounce,
      callbackCaller,
    });
  }

  async unsubscribe(channel: string, callback: PubSubCallback) {
    return this.app.pubSubManager.unsubscribe(`${this.app.name}.sync.${channel}`, callback);
  }

  async sync() {
    // TODO
  }
}

export class SyncMessageVersionManager {
  // TODO
}
