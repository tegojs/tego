import { Command } from 'commander';

import { isDev, isProd, promptForTs, run } from '../util';

export default (cli: Command) => {
  const { APP_SERVER_ROOT, SERVER_TSCONFIG_PATH } = process.env;
  cli
    .allowUnknownOption()
    .option('-h, --help')
    .action((options) => {
      if (isDev()) {
        promptForTs();
        run('tsx', [
          '--tsconfig',
          SERVER_TSCONFIG_PATH ?? '',
          '-r',
          'tsconfig-paths/register',
          `${APP_SERVER_ROOT}/src/index.ts`,
          ...process.argv.slice(2),
        ]);
      } else if (isProd()) {
        run('node', [`${APP_SERVER_ROOT}/lib/index.js`, ...process.argv.slice(2)]);
      }
    });
};
