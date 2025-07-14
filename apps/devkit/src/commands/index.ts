import { Command } from 'commander';

import { generateAppDir } from '../util';
import build from './build';
import clean from './clean';
import createNginxConf from './create-nginx-conf';
import createPlugin from './create-plugin';
import dev from './dev';
import e2e from './e2e';
import global from './global';
import init from './init';
import postinstall from './postinstall';
import tar from './tar';
import test from './test';
import upgrade from './upgrade';

export default async (cli: Command) => {
  generateAppDir();
  global(cli);
  createNginxConf(cli);
  build(cli);
  tar(cli);
  dev(cli);
  e2e(cli);
  clean(cli);
  test(cli);
  upgrade(cli);
  postinstall(cli);
  createPlugin(cli);
  init(cli);
};
