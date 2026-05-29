import path from 'node:path';
import { setupServerTestEnvironment } from '@tachybase/test/server';
import { initEnv } from '@tego/devkit';

setupServerTestEnvironment({
  workspaceRoot: process.cwd(),
  pluginPaths: [path.resolve(process.cwd(), 'packages')],
  disableRuntimePlugins: true,
  disableOtherPlugins: true,
});

initEnv();
