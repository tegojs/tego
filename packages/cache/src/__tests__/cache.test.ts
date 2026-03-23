import lodash from 'lodash';

import { Cache } from '../cache';
import { CacheManager } from '../cache-manager';

describe('cache', () => {
  let cache: Cache;

  beforeEach(async () => {
    const cacheManager = new CacheManager();
    cacheManager.registerStore({ name: 'memory', store: 'memory' });
    cache = await cacheManager.createCache({ name: 'test', store: 'memory' });
  });

  afterEach(async () => {
    await cache.reset();
  });

  it('should set and get value', async () => {
    await cache.set('key', 'value');
    const value = await cache.get('key');
    expect(value).toBe('value');
  });

  it('set and get value in object', async () => {
    const value = { a: 1 };
    await cache.set('key', value);
    const cacheA = await cache.getValueInObject('key', 'a');
    expect(cacheA).toEqual(1);

    await cache.setValueInObject('key', 'a', 2);
    const cacheVal2 = await cache.getValueInObject('key', 'a');
    expect(cacheVal2).toEqual(2);
  });

  it('wrap with condition, useCache', async () => {
    const obj = {};
    const get = () => obj;
    const val = await cache.wrapWithCondition('key', get, {
      useCache: false,
    });
    expect(val).toBe(obj);
    expect(await cache.get('key')).toBeUndefined();
    const val2 = await cache.wrapWithCondition('key', get);
    expect(val2).toBe(obj);
    expect(await cache.get('key')).toMatchObject(obj);
  });

  it('wrap with condition, isCacheable', async () => {
    let obj = {};
    const get = () => obj;
    const isCacheable = (val: any) => !lodash.isEmpty(val);
    const val = await cache.wrapWithCondition('key', get, {
      isCacheable,
    });
    expect(val).toBe(obj);
    expect(await cache.get('key')).toBeUndefined();
    obj = { a: 1 };
    const val2 = await cache.wrapWithCondition('key', get, {
      isCacheable,
    });
    expect(val2).toBe(obj);
    expect(await cache.get('key')).toMatchObject(obj);
  });

  it('setIfNotExists: first wins, second does not overwrite (memory)', async () => {
    const [ok1, ok2] = await Promise.all([
      cache.setIfNotExists('lock', { v: 1 }, 60_000),
      cache.setIfNotExists('lock', { v: 2 }, 60_000),
    ]);
    expect(ok1).toBe(true);
    expect(ok2).toBe(false);
    expect(await cache.get<{ v: number }>('lock')).toEqual({ v: 1 });
  });

  it('setIfNotExists rejects null/undefined like redis store', async () => {
    await expect(cache.setIfNotExists('k', null as any, 100)).rejects.toThrow();
    await expect(cache.setIfNotExists('k', undefined as any, 100)).rejects.toThrow();
  });
});
