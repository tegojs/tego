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
      const cwd = process.cwd();
      if (!existsSync(resolve(cwd, '.env')) && existsSync(resolve(cwd, '.env.example'))) {
        const content = await readFile(resolve(cwd, '.env.example'), 'utf-8');
        await writeFile(resolve(cwd, '.env'), content, 'utf-8');
      }
      if (!existsSync(resolve(cwd, '.env.test')) && existsSync(resolve(cwd, '.env.test.example'))) {
        const content = await readFile(resolve(cwd, '.env.test.example'), 'utf-8');
        await writeFile(resolve(cwd, '.env.test'), content, 'utf-8');
      }
    });
};
