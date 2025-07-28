import { resolve } from 'node:path';

import { Command } from 'commander';

import { PluginGenerator } from '../plugin-generator';

export default (cli: Command) => {
  cli
    .command('create-plugin')
    .argument('<name>')
    .allowUnknownOption()
    .action(async (name, options) => {
      const generator = new PluginGenerator({
        cwd: resolve(process.cwd(), name),
        args: options,
        context: {
          name,
        },
      });
      await generator.run();
    });
};
