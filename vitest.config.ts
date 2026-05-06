import tegoConfig from '@tachybase/test/vitest';

import { defineConfig, mergeConfig, type ViteUserConfig } from 'vitest/config';

export default mergeConfig(tegoConfig as ViteUserConfig, defineConfig({}));
