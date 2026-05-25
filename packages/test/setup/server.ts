import path from 'node:path';
import { initEnv } from '@tego/devkit';

import { setupServerTestEnvironment } from '../src/server/setupTestEnvironment';

setupServerTestEnvironment({
  workspaceRoot: process.cwd(),
  pluginPaths: [path.resolve(process.cwd(), 'packages')],
  disableRuntimePlugins: true,
  disableOtherPlugins: true,
});

initEnv();
