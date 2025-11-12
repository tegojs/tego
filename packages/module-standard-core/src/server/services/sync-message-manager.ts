import { TOKENS, type Tego } from '@tego/core';

import { PubSubCallback, PubSubManager, PubSubManagerPublishOptions } from './pub-sub';

export class SyncMessageManager {
  protected versionManager: SyncMessageVersionManager;

  constructor(
    private tego: Tego,
    private options: any = {},
  ) {
    this.versionManager = new SyncMessageVersionManager();

    tego.on('plugin:afterLoad', async (plugin) => {
      if (!plugin.name || typeof plugin.handleSyncMessage !== 'function') {
        return;
      }
      await this.subscribe(plugin.name, plugin.handleSyncMessage, plugin);
    });

    tego.on('tego:beforeStop', async () => {
      const plugins = Array.from(tego.pm.getPlugins()).map(([, plugin]) => plugin);
      const promises = plugins
        .filter((plugin) => plugin?.name && typeof plugin.handleSyncMessage === 'function')
        .map((plugin) => this.unsubscribe(plugin.name, plugin.handleSyncMessage));
      await Promise.all(promises);
    });
  }

  private get pubSubManager(): PubSubManager {
    return this.tego.container.get(TOKENS.PubSubManager);
  }

  get debounce() {
    const adapterName = this.pubSubManager.adapter?.constructor?.name;
    const defaultDebounce = adapterName === 'MemoryPubSubAdapter' ? 0 : 1000;
    return this.options.debounce ?? defaultDebounce;
  }

  async publish(channel: string, message: any, options?: PubSubManagerPublishOptions & { transaction?: any }) {
    const { transaction, ...others } = options || {};
    if (transaction) {
      return await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Publish message timeout on channel ${channel}`));
        }, 50000);

        transaction.afterCommit(async () => {
          try {
            const result = await this.pubSubManager.publish(`${this.tego.name}.sync.${channel}`, message, {
              skipSelf: true,
              ...others,
            });
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            clearTimeout(timer);
          }
        });
      });
    }

    return this.pubSubManager.publish(`${this.tego.name}.sync.${channel}`, message, {
      skipSelf: true,
      ...others,
    });
  }

  async subscribe(channel: string, callback: PubSubCallback, callbackCaller: any) {
    return this.pubSubManager.subscribe(`${this.tego.name}.sync.${channel}`, callback, {
      debounce: this.debounce,
      callbackCaller,
    });
  }

  async unsubscribe(channel: string, callback: PubSubCallback) {
    return this.pubSubManager.unsubscribe(`${this.tego.name}.sync.${channel}`, callback);
  }

  async sync() {
    // TODO: implementation hook
  }
}

export class SyncMessageVersionManager {
  // TODO
}

export const registerSyncMessageManager = (tego: Tego, options: any = {}) => {
  const manager = new SyncMessageManager(tego, options);
  tego.container.set({ id: TOKENS.SyncMessageManager, value: manager });
  return manager;
};
