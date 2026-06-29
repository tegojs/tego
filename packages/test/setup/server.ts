import path from 'node:path';
import { patchCjsResolverForTestRuntime, setupServerTestEnvironment } from '@tachybase/test/server';
import { initEnv } from '@tego/devkit';

// Patch CJS resolver BEFORE any test modules load to prevent dual-instance bugs
patchCjsResolverForTestRuntime();

setupServerTestEnvironment({
  workspaceRoot: process.cwd(),
  pluginPaths: [path.resolve(process.cwd(), 'packages')],
  disableRuntimePlugins: true,
  disableOtherPlugins: true,
});

initEnv();
