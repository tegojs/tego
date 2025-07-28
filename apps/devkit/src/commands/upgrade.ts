import { Command } from 'commander';

import { hasTsNode, promptForTs, runAppCommand } from '../util';

export default (cli: Command) => {
  cli
    .command('upgrade')
    .allowUnknownOption()
    .option('--raw')
    .option('-S|--skip-code-update')
    .action(async (options) => {
      if (hasTsNode()) {
        promptForTs();
      }
      // FIXME
      process.env.IS_DEV_CMD = 'true';
      await runAppCommand('upgrade');
    });
};
