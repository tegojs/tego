import { getPkgLog } from '../build/utils';
import { IBuildablePackage, IBuildContext } from '../interfaces';

export class SkipPackage implements IBuildablePackage {
  static name = 'skip';
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
    log('skip ', this.name);
  }
}
