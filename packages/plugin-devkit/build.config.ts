import fs from 'node:fs/promises';
import path from 'node:path';

import { defineConfig } from '@tego/devkit';

export default defineConfig({
  afterBuild: async (log) => {
    // 清理构建目录，不走这个逻辑
    fs.rm(path.resolve(__dirname, './dist/node_modules'), { recursive: true });
  },
});
