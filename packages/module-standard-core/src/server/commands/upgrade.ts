import type { Tego } from '@tego/core';

export default (app: Tego) => {
  app
    .command('upgrade')
    .ipc()
    .action(async (...cliArgs) => {
      await app.upgrade({
        cliArgs,
      });
      app.logger.info('app has been upgraded');
    });
};
