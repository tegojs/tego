import crypto from 'node:crypto';

import _ from 'lodash';

import { type PubSubManagerSubscribeOptions } from './types';

export class HandlerManager {
  handlers: Map<any, any>;
  uniqueMessageHandlers: Map<any, any>;

  constructor(protected publisherId: string) {
    this.reset();
  }

  public adapterType: string;

  protected async getMessageHash(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(message));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  protected verifyMessage({ onlySelf, skipSelf, publisherId }) {
    if (onlySelf && publisherId !== this.publisherId) {
      return;
    } else if (!onlySelf && skipSelf && publisherId === this.publisherId) {
      return;
    }
    return true;
  }

  protected debounce(func, wait: number) {
    if (wait) {
      return _.debounce(func, wait);
    }
    return func;
  }

  async handleMessage({
    channel,
    message,
    callback,
    debounce,
    callbackCaller,
  }: {
    channel: string;
    message: Readonly<any>;
    callback: any;
    debounce: number;
    callbackCaller: any;
  }) {
    if (!debounce) {
      await callback.bind(callbackCaller)(message);
      return;
    }
    const messageHash = channel + (await this.getMessageHash(message));
    if (!this.uniqueMessageHandlers.has(messageHash)) {
      this.uniqueMessageHandlers.set(messageHash, this.debounce(callback.bind(callbackCaller), debounce));
    }
    const handler = this.uniqueMessageHandlers.get(messageHash);
    try {
      await handler(message);
      setTimeout(() => {
        this.uniqueMessageHandlers.delete(messageHash);
      }, debounce);
    } catch (error) {
      this.uniqueMessageHandlers.delete(messageHash);
      throw error;
    }
  }

  wrapper(channel, callback, options) {
    const { debounce = 0, callbackCaller } = options;
    return async (wrappedMessage) => {
      let json;
      if (this.adapterType !== 'MemoryPubSubAdapter') {
        json = JSON.parse(wrappedMessage);
      } else {
        json = wrappedMessage;
      }
      if (!this.verifyMessage(json)) {
        return;
      }
      await this.handleMessage({ channel, message: json.message, debounce, callback, callbackCaller });
    };
  }

  set(channel: string, callback, options: PubSubManagerSubscribeOptions) {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Map());
    }
    const handlerMap = this.handlers.get(channel);
    const handler = this.wrapper(channel, callback, options);
    handlerMap.set(callback, handler);
    return handler;
  }

  get(channel: string, callback) {
    const handlerMap = this.handlers.get(channel);
    if (!handlerMap) {
      return;
    }
    return handlerMap.get(callback);
  }

  delete(channel: string, callback) {
    if (!callback) {
      return;
    }
    const handlerMap = this.handlers.get(channel);
    if (!handlerMap) {
      return;
    }
    const handler = handlerMap.get(callback);
    handlerMap.delete(callback);
    return handler;
  }

  reset() {
    this.handlers = new Map();
    this.uniqueMessageHandlers = new Map();
  }

  async each(callback) {
    for (const [channel, handlerMap] of this.handlers) {
      for (const handler of handlerMap.values()) {
        await callback(channel, handler);
      }
    }
  }
}
