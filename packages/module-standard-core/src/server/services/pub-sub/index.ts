import { uid } from '@tachybase/utils';
import { TOKENS, type Tego } from '@tego/core';

import { HandlerManager } from './handler-manager';
import { MemoryPubSubAdapter } from './memory-pub-sub-adapter';
import {
  PubSubCallback,
  type IPubSubAdapter,
  type PubSubManagerOptions,
  type PubSubManagerPublishOptions,
  type PubSubManagerSubscribeOptions,
} from './types';

export const createPubSubManager = (tego: Tego, options: PubSubManagerOptions = {}) => {
  const pubSubManager = new PubSubManager(tego, options);
  pubSubManager.setAdapter(MemoryPubSubAdapter.create());

  return pubSubManager;
};

export class PubSubManager {
  protected publisherId: string;
  public adapter: IPubSubAdapter;
  protected handlerManager: HandlerManager;

  constructor(
    private tego: Tego,
    protected options: PubSubManagerOptions = {},
  ) {
    this.publisherId = uid();
    this.handlerManager = new HandlerManager(this.publisherId);

    tego.on('tego:afterStart', async () => {
      await this.connect();
    });
    tego.on('tego:afterStop', async () => {
      await this.close();
    });

    tego.container.set({ id: TOKENS.PubSubManager, value: this });
  }

  get channelPrefix() {
    return this.options?.channelPrefix ? `${this.options.channelPrefix}.` : '';
  }

  setAdapter(adapter: IPubSubAdapter) {
    this.adapter = adapter;
    this.handlerManager.adapterType = adapter.constructor.name;
  }

  async isConnected() {
    if (this.adapter) {
      return this.adapter.isConnected();
    }
    return false;
  }

  async connect() {
    if (!this.adapter) {
      return;
    }
    await this.adapter.connect();
    await this.handlerManager.each(async (channel, handler) => {
      await this.adapter.subscribe(`${this.channelPrefix}${channel}`, handler);
    });
  }

  async close() {
    if (!this.adapter) {
      return;
    }
    return await this.adapter.close();
  }

  async subscribe(channel: string, callback: PubSubCallback, options: PubSubManagerSubscribeOptions = {}) {
    await this.unsubscribe(channel, callback);
    const handler = this.handlerManager.set(channel, callback, options);

    if (await this.isConnected()) {
      await this.adapter.subscribe(`${this.channelPrefix}${channel}`, handler);
    }
  }

  async unsubscribe(channel: string, callback: PubSubCallback) {
    const handler = this.handlerManager.delete(channel, callback);

    if (!this.adapter || !handler) {
      return;
    }

    return this.adapter.unsubscribe(`${this.channelPrefix}${channel}`, handler);
  }

  async publish(channel: string, message: any, options?: PubSubManagerPublishOptions) {
    if (!this.adapter?.isConnected()) {
      return;
    }

    const messageRow = {
      publisherId: this.publisherId,
      ...options,
      message,
    };

    const wrappedMessage =
      this.adapter.constructor.name === 'MemoryPubSubAdapter' ? messageRow : JSON.stringify(messageRow);

    return this.adapter.publish(`${this.channelPrefix}${channel}`, wrappedMessage);
  }
}

export const registerPubSub = (tego: Tego, options: PubSubManagerOptions = {}) => {
  return new PubSubManager(tego, options);
};
