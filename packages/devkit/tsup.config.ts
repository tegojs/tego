import path from 'node:path';

import { esbuildPluginFilePathExtensions } from 'esbuild-plugin-file-path-extensions';
import fg from 'fast-glob';
import { defineConfig } from 'tsup';

const entry = fg.globSync(['src/**'], { cwd: __dirname, absolute: true });

export default defineConfig({
  entry,
  tsconfig: path.join(__dirname, 'tsconfig.json'),
  outDir: path.join(__dirname, 'lib'),
  splitting: false,
  silent: true,

  outExtension() {
    return {
      js: `.mjs`,
    };
  },
  esbuildPlugins: [
    esbuildPluginFilePathExtensions({
      esm: true,
    }),
  ],

  format: ['esm'],
  sourcemap: false,

  clean: true,
  bundle: true,
  loader: {
    '.d.ts': 'copy',
  },
  skipNodeModulesBundle: true,
});
