import path from 'node:path';

import { pluginLess } from '@rsbuild/plugin-less';
import { pluginReact } from '@rsbuild/plugin-react';
import { build } from '@rslib/core';
import fg from 'fast-glob';
import { build as tsupBuild } from 'tsup';

import { globExcludeFiles } from './constant';
import { PkgLog, UserConfig } from './utils';

export async function buildClient(cwd: string, userConfig: UserConfig, sourcemap: boolean = false, log: PkgLog) {
  log('build client');
  const cwdWin = cwd.replaceAll(/\\/g, '/');
  const cwdUnix = cwd.replaceAll(/\//g, '\\');
  const external = function (id: string) {
    if (id.startsWith('.') || id.startsWith(cwdUnix) || id.startsWith(cwdWin)) {
      return false;
    }
    return true;
  };
  await buildClientEsm(cwd, userConfig, sourcemap, external, log);
  await buildLocale(cwd, userConfig, log);
}

type External = (id: string) => boolean;

async function buildClientEsm(
  cwd: string,
  userConfig: UserConfig,
  sourcemap: boolean,
  external: External,
  log: PkgLog,
) {
  const entry = fg.globSync(['src/**', ...globExcludeFiles, '!src/**/*.json'], { cwd, absolute: true });

  await build({
    source: {
      entry: {
        index: entry,
      },
      define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
        'process.env.__TEST__': false,
        'process.env.__E2E__': process.env.__E2E__ ? true : false,
      },
    },
    lib: [
      {
        bundle: false,
        dts: false,
        format: 'esm',
        output: {
          distPath: {
            root: path.join(cwd, 'es'),
          },
        },
      },
      {
        output: {
          distPath: {
            root: path.join(cwd, 'lib'),
          },
        },
        bundle: false,
        dts: false,
        format: 'cjs',
      },
    ],
    output: {
      sourceMap: {
        css: sourcemap,
        js: sourcemap ? 'source-map' : false,
      },
      target: 'web',
      overrideBrowserslist: ['chrome >= 69', 'edge >= 79', 'safari >= 12'],
      externals({ request }, callback) {
        if (external(request)) {
          return callback(null, request);
        }
        callback();
      },
    },
    plugins: [pluginReact(), pluginLess()],
  });
}

export function buildLocale(cwd: string, userConfig: UserConfig, log: PkgLog) {
  log('build client locale');

  const entry = fg.globSync(['src/locale/**', ...globExcludeFiles], { cwd, absolute: true });
  const outDir = path.resolve(cwd, 'lib', 'locale');
  return tsupBuild(
    userConfig.modifyTsupConfig({
      entry,
      splitting: false,
      clean: false,
      bundle: false,
      silent: true,
      treeshake: false,
      target: 'node16',
      keepNames: true,
      outDir,
      format: 'cjs',
      skipNodeModulesBundle: true,
    }),
  );
}
