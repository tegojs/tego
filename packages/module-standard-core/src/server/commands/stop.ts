import type { Tego } from '@tego/core';

export default (app: Tego) => {
  app
    .command('stop')
    .ipc()
    .action(async () => {
      await app.stop();
      app.logger.info('app has been stopped');
    });
};
