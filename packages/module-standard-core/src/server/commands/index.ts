import type { Tego } from '@tego/core';

import consoleCommand from './console';
import createMigration from './create-migration';
import dbAuth from './db-auth';
import dbClean from './db-clean';
import dbSync from './db-sync';
import destroy from './destroy';
import install from './install';
import pm from './pm';
import refresh from './refresh';
import restart from './restart';
import start from './start';
import stop from './stop';
import upgrade from './upgrade';

export function registerCommands(tego: Tego) {
  consoleCommand(tego);
  dbAuth(tego);
  createMigration(tego);
  dbClean(tego);
  dbSync(tego);
  install(tego);
  upgrade(tego);
  pm(tego);
  restart(tego);
  stop(tego);
  destroy(tego);
  start(tego);
  refresh(tego);

  // development only with @tachybase/cli
  tego.command('build').argument('[packages...]');
  tego.command('clean');
  tego.command('dev').usage('[options]').option('-p, --port [port]').option('--client').option('--server');
  tego.command('doc').argument('[cmd]', '', 'dev');
  tego.command('test').option('-c, --db-clean');
}
