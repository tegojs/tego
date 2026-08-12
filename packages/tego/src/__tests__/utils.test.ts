import { describe, expect, it } from 'vitest';

import { convertEnvToSettings, mergeExternalPluginPresets } from '../utils';

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
    expect(result.logger.max_files).toBeUndefined(); // 未提供
    expect(result.logger.maxFiles).toBe('7d');
    expect(result.database.storage).toBe('storage/db/tachybase.sqlite');
    expect(result.cache.default_store).toBe('memory');
    expect(result.env.INIT_APP_LANG).toBe('zh-CN');
  });
});

describe('mergeExternalPluginPresets', () => {
  it('should append plugins added by a newer default preset', () => {
    const defaults = [
      { name: 'existing', enabledByDefault: true },
      { name: 'new-plugin', enabledByDefault: false },
    ];
    const runtime = [{ name: 'existing', enabledByDefault: true }];

    expect(mergeExternalPluginPresets(defaults, runtime)).toEqual(defaults);
  });

  it('should preserve runtime overrides for existing plugins', () => {
    const defaults = [{ name: 'existing', enabledByDefault: true }];
    const runtime = [{ name: 'existing', enabledByDefault: false }];

    expect(mergeExternalPluginPresets(defaults, runtime)).toEqual(runtime);
  });

  it('should preserve runtime-only plugins without creating duplicates', () => {
    const defaults = [{ name: 'existing', enabledByDefault: true }];
    const runtime = [
      { name: 'existing', enabledByDefault: false },
      { name: 'private-plugin', enabledByDefault: false },
    ];

    expect(mergeExternalPluginPresets(defaults, runtime)).toEqual(runtime);
  });
});
