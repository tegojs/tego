import { Command } from 'commander';

import { promptForTs, runAppCommand } from '../util';

export default (cli: Command) => {
  cli
    .command('install')
    .allowUnknownOption()
    .action(async (options) => {
      promptForTs();
      await runAppCommand('install', process.argv.slice(2));
    });
};
