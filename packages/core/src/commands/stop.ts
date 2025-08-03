import Application from '../application';

export default (app: Application) => {
  app
    .command('stop')
    .ipc()
    .action(async (...cliArgs) => {
      if (!(await app.isStarted())) {
        app.logger.info('app has not started');
        return;
      }
      await app.stop({
        cliArgs,
      });
    });
};
