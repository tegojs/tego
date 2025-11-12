import type { Tego } from '@tego/core';

export default (app: Tego) => {
  app
    .command('destroy')
    .preload()
    .action(async (...cliArgs) => {
      await app.destroy({
        cliArgs,
      });
    });
};
