import { EventEmitter } from 'node:events';
import { applyMixins, AsyncEmitter, uid } from '@tachybase/utils';

import { IPubSubAdapter } from './types';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class TestEventEmitter extends EventEmitter {
  declare emitAsync: (event: string | symbol, ...args: any[]) => Promise<boolean>;
}

applyMixins(TestEventEmitter, [AsyncEmitter]);

export class MemoryPubSubAdapter implements IPubSubAdapter {
  protected emitter: TestEventEmitter;

  connected = false;

  static instances = new Map<string, MemoryPubSubAdapter>();

  static create(name?: string, options?: any) {
    if (!name) {
      name = uid();
    }
    if (!this.instances.has(name)) {
      this.instances.set(name, new MemoryPubSubAdapter(options));
    }
    return this.instances.get(name);
  }

  constructor(protected options: any = {}) {
    this.emitter = new TestEventEmitter();
  }

  async connect() {
    this.connected = true;
  }

  async close() {
    this.connected = false;
  }

  async isConnected() {
    return this.connected;
  }

  async subscribe(channel, callback) {
    this.emitter.on(channel, callback);
  }

  async unsubscribe(channel, callback) {
    this.emitter.off(channel, callback);
  }

  async publish(channel, message) {
    if (!this.connected) {
      return;
    }
    await this.emitter.emitAsync(channel, message);
    await this.emitter.emitAsync('__publish__', channel, message);
    if (this.options.debounce) {
      await sleep(Number(this.options.debounce));
    }
  }

  async subscribeAll(callback) {
    this.emitter.on('__publish__', callback);
  }
}
