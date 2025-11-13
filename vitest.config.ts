import tegoConfig from '@tachybase/test/vitest';

import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(tegoConfig, defineConfig({}));
