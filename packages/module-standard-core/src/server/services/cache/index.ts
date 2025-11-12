import { CacheManager, CacheManagerOptions } from '@tachybase/cache';
import { TOKENS, type Tego } from '@tego/core';

export const createCacheManager = async (tego: Tego, options: CacheManagerOptions = {}) => {
  const cacheManager = new CacheManager(options);
  const defaultCache = await cacheManager.createCache({ name: tego.name });

  tego.container.set(TOKENS.CacheManager, cacheManager);
  tego.container.set(TOKENS.Cache, defaultCache);

  return cacheManager;
};
