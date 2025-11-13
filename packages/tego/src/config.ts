import { parseDatabaseOptionsFromEnv } from '@tachybase/database';
import TachybaseGlobal from '@tachybase/globals';
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
      defaultStore: TachybaseGlobal.settings.cache.defaultStore ?? 'memory',
      stores: {
        memory: {
          store: 'memory',
          max: TachybaseGlobal.settings.cache.memoryMax ?? 2000,
        },
        ...(TachybaseGlobal.settings.cache.redisUrl
          ? {
              redis: {
                url: TachybaseGlobal.settings.cache.redisUrl,
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
