import Application from '../application';

export default (app: Application) => {
  app
    .command('upgrade')
    .ipc()
    .auth()
    .action(async (options) => {
      await app.upgrade(options);
      app.logger.info(`✨  TachyBase has been upgraded to v${await app.version.get()}`);
    });
};
