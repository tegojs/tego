import path from 'node:path';

import { createRsbuild, loadConfig } from '@rsbuild/core';

import { ROOT_PATH } from '../build/constant';
import { tarPlugin } from '../build/tarPlugin';
import { getPkgLog } from '../build/utils';
import { IBuildablePackage, IBuildContext } from '../interfaces';

export class AppWebPackage implements IBuildablePackage {
  static name = 'app web';
  name: string;
  dir: string;
  context: IBuildContext;

  constructor(name: string, dir: string, context: IBuildContext) {
    this.name = name;
    this.dir = dir;
    this.context = context;
  }
  async build() {
    const log = getPkgLog(this.name);

    if (this.context.onlyTar) {
      return await tarPlugin(this.dir, log);
    }

    const config = await loadConfig({
      cwd: path.join(ROOT_PATH, 'apps/web'),
    });
    const rsbuild = await createRsbuild({
      rsbuildConfig: config.content,
      cwd: path.join(ROOT_PATH, 'apps/web'),
    });
    await rsbuild.build();

    if (this.context.tar) {
      await tarPlugin(this.dir, log);
    }

    log('done');
  }
}
