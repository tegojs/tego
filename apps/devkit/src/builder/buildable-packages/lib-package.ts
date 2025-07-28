import { buildCjs } from '../build/buildCjs';
import { buildClient } from '../build/buildClient';
import { buildDeclaration } from '../build/buildDeclaration';
import { buildEsm } from '../build/buildEsm';
import { CORE_CLIENT, ESM_PACKAGES } from '../build/constant';
import { tarPlugin } from '../build/tarPlugin';
import { getPkgLog, getUserConfig } from '../build/utils';
import { IBuildablePackage, IBuildContext } from '../interfaces';

export class LibPackage implements IBuildablePackage {
  static name = 'lib';
  name: string;
  dir: string;
  context: IBuildContext;
  isEsm: boolean = false;
  isClient: boolean = false;

  constructor(name: string, dir: string, context: IBuildContext) {
    this.name = name;
    this.dir = dir;
    this.context = context;

    this.isEsm = ESM_PACKAGES.includes(this.name);
    this.isClient = this.dir === CORE_CLIENT;
  }
  async build() {
    const log = getPkgLog(this.name);

    if (this.context.onlyTar) {
      return await tarPlugin(this.dir, log);
    }

    const userConfig = getUserConfig(this.dir);
    if (userConfig.beforeBuild) {
      log('beforeBuild');
      await userConfig.beforeBuild(log);
    }

    if (!this.isClient) {
      // client should skip
      await buildCjs(this.dir, userConfig, this.context.sourcemap, log);
      if (this.context.dts) {
        await buildDeclaration(this.dir, 'lib', log);
      }
    }
    if (this.isClient) {
      await buildClient(this.dir, userConfig, this.context.sourcemap, log);
      if (this.context.dts) {
        await buildDeclaration(this.dir, 'es', log);
      }
    }
    if (this.isEsm) {
      await buildEsm(this.dir, userConfig, this.context.sourcemap, log);
      if (this.context.dts) {
        await buildDeclaration(this.dir, 'es', log);
      }
    }

    if (userConfig.afterBuild) {
      log('afterBuild');
      await userConfig.afterBuild(log);
    }

    if (this.context.tar) {
      await tarPlugin(this.dir, log);
    }

    log('done');
  }
}
