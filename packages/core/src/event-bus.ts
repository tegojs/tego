import { EventEmitter } from 'node:events';

/**
 * Event handler function type
 */
export type EventHandler<T = any> = (data: T, ...args: any[]) => void | Promise<void>;

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;

/**
 * Subscribe options
 */
export interface SubscribeOptions {
  /**
   * Priority of the handler (higher priority handlers are called first)
   */
  priority?: number;
}

/**
 * EventBus interface for application-wide events.
 * This replaces the AsyncEmitter mixin pattern.
 */
export interface IEventBus {
  /**
   * Subscribe to an event
   */
  on<T = any>(event: string, handler: EventHandler<T>, options?: SubscribeOptions): Unsubscribe;

  /**
   * Subscribe to an event (one-time)
   */
  once<T = any>(event: string, handler: EventHandler<T>): Unsubscribe;

  /**
   * Unsubscribe from an event
   */
  off(event: string, handler: EventHandler): void;

  /**
   * Emit an event asynchronously
   */
  emitAsync(event: string, ...args: any[]): Promise<void>;

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: string): number;

  /**
   * Remove all listeners for an event (or all events if no event specified)
   */
  removeAllListeners(event?: string): void;
}

/**
 * EventBus implementation using Node.js EventEmitter
 */
export class EventBus implements IEventBus {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    // Increase max listeners to avoid warnings for apps with many plugins
    this.emitter.setMaxListeners(100);
  }

  on<T = any>(event: string, handler: EventHandler<T>, options?: SubscribeOptions): Unsubscribe {
    this.emitter.on(event, handler);

    return () => {
      this.off(event, handler);
    };
  }

  once<T = any>(event: string, handler: EventHandler<T>): Unsubscribe {
    this.emitter.once(event, handler);

    return () => {
      this.off(event, handler);
    };
  }

  off(event: string, handler: EventHandler): void {
    this.emitter.off(event, handler);
  }

  async emitAsync(event: string, ...args: any[]): Promise<void> {
    const listeners = this.emitter.listeners(event);

    for (const listener of listeners) {
      await listener(...args);
    }
  }

  listenerCount(event: string): number {
    return this.emitter.listenerCount(event);
  }

  removeAllListeners(event?: string): void {
    this.emitter.removeAllListeners(event);
  }

  /**
   * Get the underlying EventEmitter (for compatibility)
   * @internal
   */
  get raw(): EventEmitter {
    return this.emitter;
  }
}
