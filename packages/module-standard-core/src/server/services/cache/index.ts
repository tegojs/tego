import { CacheManager, CacheManagerOptions } from '@tachybase/cache';
import { TOKENS, type Tego } from '@tego/core';

export const createCacheManager = async (tego: Tego, options: CacheManagerOptions = {}) => {
  const cacheManager = new CacheManager(options);
  const defaultCache = await cacheManager.createCache({ name: tego.name });

  tego.container.set({ id: TOKENS.CacheManager, value: cacheManager });
  tego.container.set({ id: TOKENS.Cache, value: defaultCache });

  return cacheManager;
};

export const registerCache = async (tego: Tego, options: CacheManagerOptions = {}) => {
  return createCacheManager(tego, options);
};
