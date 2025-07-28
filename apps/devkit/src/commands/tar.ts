import { Command } from 'commander';

import { TachybaseBuilder } from '../builder';
import { nodeCheck } from '../util';

export default (cli: Command) => {
  cli
    .command('tar')
    .allowUnknownOption()
    .argument('[packages...]')
    .action(async (pkgs) => {
      nodeCheck();

      const tachybaseBuilder = new TachybaseBuilder({
        onlyTar: true,
      });

      await tachybaseBuilder.build(pkgs);
    });
};
