import { Command } from 'commander';
import { rimrafSync } from 'rimraf';

import { isDev } from '../util';

/**
 *
 * @param {Command} cli
 */
export default (cli: Command) => {
  cli
    .command('clean')
    .option('--all')
    .allowUnknownOption()
    .action((opts) => {
      if (!isDev()) {
        return;
      }
      rimrafSync('{apps,packages}/*/{lib,esm,es,dist,node_modules}', { glob: true });
      if (opts.all) {
        rimrafSync('node_modules', { glob: true });
      }
    });
};
