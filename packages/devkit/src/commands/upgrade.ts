import { Command } from 'commander';

import { promptForTs, runAppCommand } from '../util';

export default (cli: Command) => {
  cli
    .command('upgrade')
    .allowUnknownOption()
    .action(async (options) => {
      promptForTs();
      await runAppCommand('upgrade');
    });
};
