import { Command } from 'commander';

import { TachybaseBuilder } from '../builder';

export default (cli: Command) => {
  cli
    .command('tar')
    .allowUnknownOption()
    .argument('[packages...]')
    .action(async (pkgs) => {
      const tachybaseBuilder = new TachybaseBuilder({
        onlyTar: true,
      });

      await tachybaseBuilder.build(pkgs);
    });
};
