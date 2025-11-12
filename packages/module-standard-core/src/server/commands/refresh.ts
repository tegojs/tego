import type { Tego } from '@tego/core';

export default (app: Tego) => {
  app
    .command('refresh')
    .ipc()
    .action(async (cliArgs) => {
      await app.restart({
        cliArgs,
      });
      app.logger.info('refreshing...');
    });
};
