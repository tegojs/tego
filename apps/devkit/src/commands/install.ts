import { Command } from 'commander';

import { hasTsNode, promptForTs, runAppCommand } from '../util';

export default (cli: Command) => {
  cli
    .command('install')
    .allowUnknownOption()
    .option('--raw')
    .option('-S|--skip-code-update')
    .action(async (options) => {
      if (hasTsNode()) {
        promptForTs();
      }
      process.env.IS_DEV_CMD = 'true';
      await runAppCommand('install');
    });
};
