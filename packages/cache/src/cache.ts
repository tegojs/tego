import { Cache as BasicCache, Milliseconds } from 'cache-manager';
import { NoCacheableError } from 'cache-manager-redis-yet';

type RedisLikeStore = {
  client: {
    set(key: string, value: string, options?: { NX?: boolean; PX?: number }): Promise<string | null>;
  };
};

function serializeRedisValue(value: unknown): string {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new NoCacheableError(`"${String(value)}" is not a cacheable value`);
    }
    return serialized;
  } catch (e) {
    if (e instanceof NoCacheableError) {
      throw e;
    }
    const msg = e instanceof Error ? e.message : String(e);
    throw new NoCacheableError(`"${String(value)}" is not a cacheable value: ${msg}`);
  }
}

function isRedisLikeStore(store: unknown): store is RedisLikeStore {
  if (!store || typeof store !== 'object') return false;
  const s = store as RedisLikeStore;
  return typeof s.client?.set === 'function';
}

export class Cache {
  name: string;
  prefix?: string;
  store: BasicCache;

  /**
   * Per prefixed key: serializes memory `store.set` / `store.get`+`store.set` so `set` and
   * `setIfNotExists` cannot interleave for the same key (single-process).
   */
  private memoryWriteQueues = new Map<string, Promise<void>>();

  constructor({ name, prefix, store }: { name: string; store: BasicCache; prefix?: string }) {
    this.name = name;
    this.prefix = prefix;
    this.store = store;
  }

  key(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }

  /**
   * For memory store, waits on the same per-key queue as `setIfNotExists` so another writer
   * cannot run `this.store.set` between that method's `get` and `set`.
   */
  private async runWithMemoryWriteLock<T>(k: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.memoryWriteQueues.get(k) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((res) => {
      release = res;
    });
    const current = previous.then(() => next);
    this.memoryWriteQueues.set(k, current);
    await previous;
    try {
      return await fn();
    } finally {
      release();
      if (this.memoryWriteQueues.get(k) === current) {
        this.memoryWriteQueues.delete(k);
      }
    }
  }

  async set(key: string, value: unknown, ttl?: Milliseconds): Promise<void> {
    const k = this.key(key);
    const raw = this.store.store;
    if (isRedisLikeStore(raw)) {
      await this.store.set(k, value, ttl);
      return;
    }
    await this.runWithMemoryWriteLock(k, async () => {
      await this.store.set(k, value, ttl);
    });
  }

  async get<T>(key: string): Promise<T> {
    return await this.store.get(this.key(key));
  }

  async del(key: string): Promise<void> {
    await this.store.del(this.key(key));
  }

  async reset(): Promise<void> {
    await this.store.reset();
  }

  async wrap<T>(key: string, fn: () => Promise<T>, ttl?: Milliseconds): Promise<T> {
    return await this.store.wrap(this.key(key), fn, ttl);
  }

  async wrapWithCondition<T>(
    key: string,
    fn: () => T | Promise<T>,
    options?: {
      useCache?: boolean;
      isCacheable?: (val: unknown) => boolean | Promise<boolean>;
      ttl?: Milliseconds;
    },
  ): Promise<T> {
    const { useCache, isCacheable, ttl } = options || {};
    if (useCache === false) {
      return await fn();
    }
    const value = await this.get<T>(key);
    if (value) {
      return value;
    }
    const result = await fn();
    const cacheable = isCacheable ? await isCacheable(result) : result;
    if (!cacheable) {
      return result;
    }
    await this.set(key, result, ttl);
    return result;
  }

  async mset(args: [string, unknown][], ttl?: Milliseconds): Promise<void> {
    await this.store.store.mset(
      args.map(([key, value]) => [this.key(key), value]),
      ttl,
    );
  }

  async mget(...args: string[]): Promise<unknown[]> {
    args = args.map((key) => this.key(key));
    return await this.store.store.mget(...args);
  }

  async mdel(...args: string[]): Promise<void> {
    args = args.map((key) => this.key(key));
    await this.store.store.mdel(...args);
  }

  async keys(pattern?: string): Promise<string[]> {
    const keys = await this.store.store.keys(pattern);
    return keys.map((key) => key.replace(`${this.name}:`, ''));
  }

  async ttl(key: string): Promise<number> {
    return await this.store.store.ttl(this.key(key));
  }

  async setValueInObject(key: string, objectKey: string, value: unknown) {
    const object = (await this.get(key)) || {};
    object[objectKey] = value;
    await this.set(key, object);
  }

  async getValueInObject(key: string, objectKey: string) {
    const object = (await this.get(key)) || {};
    return object[objectKey];
  }

  async delValueInObject(key: string, objectKey: string) {
    const object = (await this.get(key)) || {};
    delete object[objectKey];
    await this.set(key, object);
  }

  /**
   * Atomically set `key` to `value` with expiry `ttl` (ms) only if `key` is absent.
   * Returns `true` if the key was set, `false` if it already existed.
   *
   * - **Redis**: `SET` with `NX` and `PX` (safe across processes/instances).
   * - **Memory**: `this.store.get` / `this.store.set` run under the same per-key `memoryWriteQueues`
   *   lock as `set`, so another `cache.set` cannot interleave between get and set (single-process;
   *   multi-instance locks still require Redis).
   */
  async setIfNotExists(key: string, value: unknown, ttl: number): Promise<boolean> {
    if (value === undefined || value === null) {
      throw new NoCacheableError(`"${value}" is not a cacheable value`);
    }
    const k = this.key(key);
    const raw = this.store.store;

    if (isRedisLikeStore(raw)) {
      const payload = serializeRedisValue(value);
      const opts = ttl !== undefined && ttl !== 0 ? ({ NX: true, PX: ttl } as const) : ({ NX: true } as const);
      const reply = await raw.client.set(k, payload, opts);
      return reply === 'OK';
    }

    return this.runWithMemoryWriteLock(k, async () => {
      const existing = await this.store.get(k);
      if (existing !== undefined) {
        return false;
      }
      await this.store.set(k, value, ttl);
      return true;
    });
  }
}
