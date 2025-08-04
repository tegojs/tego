import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { Command } from 'commander';

import { generatePlaywrightPath, isDev } from '../util';

export default (cli: Command) => {
  cli
    .command('postinstall')
    .allowUnknownOption()
    .action(async () => {
      generatePlaywrightPath(true);
      if (!isDev()) {
        return;
      }
    });
};
