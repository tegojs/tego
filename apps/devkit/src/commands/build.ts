import { type Command } from 'commander';

import { TachybaseBuilder } from '../builder';
import { nodeCheck } from '../util';

export default (cli: Command) => {
  cli
    .command('build')
    .allowUnknownOption()
    .argument('[packages...]')
    .option('-r, --retry', 'retry the last failed package')
    .option('-s, --sourcemap', 'generate server sourcemap')
    .option('--no-dts', 'not generate dts')
    .option('--tar', 'tar the package')
    .option('--only-tar', 'only tar the package')
    .option('--development', 'development mode')
    .action(async (pkgs, options) => {
      nodeCheck();

      const tachybaseBuilder = new TachybaseBuilder({
        dts: options.dts,
        sourcemap: options.sourcemap,
        retry: options.retry,
        tar: options.tar,
        onlyTar: options.onlyTar,
        development: options.development,
      });

      await tachybaseBuilder.build(pkgs);
    });
};
