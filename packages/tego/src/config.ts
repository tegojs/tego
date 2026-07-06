import { parseDatabaseOptionsFromEnv } from '@tachybase/database';
import TachybaseGlobal from '@tachybase/globals';
import { getLoggerLevel, getLoggerTransport } from '@tachybase/logger';

const DEFAULT_REQUEST_BODY_LIMIT = '10mb';
const SIZE_LIMIT_PATTERN = /^[1-9]\d*(?:b|kb|mb|gb|tb)$/i;

export function getBodyParserOptions(env: NodeJS.ProcessEnv = process.env) {
  const requestBodyLimit = env.APP_REQUEST_BODY_LIMIT?.trim() || DEFAULT_REQUEST_BODY_LIMIT;

  if (!SIZE_LIMIT_PATTERN.test(requestBodyLimit)) {
    throw new Error(
      `Invalid APP_REQUEST_BODY_LIMIT "${requestBodyLimit}". Expected a positive integer followed by b, kb, mb, gb, or tb.`,
    );
  }

  return {
    jsonLimit: requestBodyLimit,
    formLimit: requestBodyLimit,
    textLimit: requestBodyLimit,
  };
}

export async function getConfig() {
  return {
    database: {
      ...(await parseDatabaseOptionsFromEnv()),
    } as any,
    bodyParser: getBodyParserOptions(),
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
