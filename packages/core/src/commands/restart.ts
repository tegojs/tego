import Application from '../application';

export default (app: Application) => {
  app
    .command('restart')
    .ipc()
    .action(async (...cliArgs) => {
      if (!(await app.isStarted())) {
        app.logger.info('app has not started');
        return;
      }
      await app.restart({
        cliArgs,
      });
      app.logger.info('app has been restarted');
    });
};
