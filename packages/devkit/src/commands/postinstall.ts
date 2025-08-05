import { Command } from 'commander';

import { generatePlaywrightPath } from '../util';

export default (cli: Command) => {
  cli
    .command('postinstall')
    .allowUnknownOption()
    .action(async () => {
      generatePlaywrightPath(true);
    });
};
