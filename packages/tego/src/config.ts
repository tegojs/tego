import { parseDatabaseOptionsFromEnv } from '@tachybase/database';
import { getLoggerLevel, getLoggerTransport } from '@tachybase/logger';

export async function getConfig() {
  return {
    database: {
      ...(await parseDatabaseOptionsFromEnv()),
    } as any,
    resourcer: {
      prefix: process.env.API_BASE_PATH || '/api/',
    },
    plugins: ['tachybase'],
    cacheManager: {
      defaultStore: process.env.CACHE_DEFAULT_STORE || 'memory',
      stores: {
        memory: {
          store: 'memory',
          max: parseInt(process.env.CACHE_MEMORY_MAX) || 2000,
        },
        ...(process.env.CACHE_REDIS_URL
          ? {
              redis: {
                url: process.env.CACHE_REDIS_URL,
              },
            }
          : {}),
      },
    },
    logger: {
      request: {
        transports: getLoggerTransport(),
        level: getLoggerLevel(),
      },
      system: {
        transports: getLoggerTransport(),
        level: getLoggerLevel(),
      },
    },
    perfHooks: process.env.ENABLE_PERF_HOOKS ? true : false,
  };
}
