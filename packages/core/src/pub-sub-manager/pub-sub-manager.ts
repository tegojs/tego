import { uid } from '@tachybase/utils';

import Application from '../application';
import { HandlerManager } from './handler-manager';
import { MemoryPubSubAdapter } from './memory-pub-sub-adapter';
import {
  PubSubCallback,
  type IPubSubAdapter,
  type PubSubManagerOptions,
  type PubSubManagerPublishOptions,
  type PubSubManagerSubscribeOptions,
} from './types';

export const createPubSubManager = (app: Application, options: PubSubManagerOptions) => {
  const pubSubManager = new PubSubManager(options);
  pubSubManager.setAdapter(MemoryPubSubAdapter.create());
  app.on('afterStart', async () => {
    await pubSubManager.connect();
  });
  app.on('afterStop', async () => {
    await pubSubManager.close();
  });
  return pubSubManager;
};

export class PubSubManager {
  protected publisherId: string;
  public adapter: IPubSubAdapter;
  protected handlerManager: HandlerManager;

  constructor(protected options: PubSubManagerOptions = {}) {
    this.publisherId = uid();
    this.handlerManager = new HandlerManager(this.publisherId);
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
    // 如果没连接前添加的订阅，连接后需要把订阅添加上
    await this.handlerManager.each(async (channel, headler) => {
      await this.adapter.subscribe(`${this.channelPrefix}${channel}`, headler);
    });
  }

  async close() {
    if (!this.adapter) {
      return;
    }
    return await this.adapter.close();
  }

  async subscribe(channel: string, callback: PubSubCallback, options: PubSubManagerSubscribeOptions = {}) {
    // 先退订，防止重复订阅 TODO: 这里用bind(this),导致无法取消订阅
    await this.unsubscribe(channel, callback);
    const handler = this.handlerManager.set(channel, callback, options);
    // 连接之后才能订阅

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
      message: message,
    };

    const wrappedMessage =
      this.adapter.constructor.name === 'MemoryPubSubAdapter' ? messageRow : JSON.stringify(messageRow);

    return this.adapter.publish(`${this.channelPrefix}${channel}`, wrappedMessage);
  }
}
