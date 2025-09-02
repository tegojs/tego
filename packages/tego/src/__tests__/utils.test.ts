import { describe, expect, it } from 'vitest';

import { convertEnvToSettings } from '../utils';

describe('convertEnvToSettings', () => {
  it('should convert flat env into structured settings object', () => {
    const input = {
      LOGGER_TRANSPORT: 'console,dailyRotateFile',
      LOGGER_MAX_FILES: '7d',
      DB_STORAGE: 'storage/db/tachybase.sqlite',
      CACHE_DEFAULT_STORE: 'memory',
      INIT_APP_LANG: 'zh-CN',
    };

    const result = convertEnvToSettings(input as any);

    expect(result.logger.transport).toEqual(['console', 'dailyRotateFile']);
    expect(result.logger.maxFiles).toBe('7d');
    expect(result.database.storage).toBe('storage/db/tachybase.sqlite');
    expect(result.cache.defaultStore).toBe('memory');
  });
});
