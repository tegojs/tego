import fs from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fsExists } from '@tachybase/utils';

import Application from '../application';
import { ApplicationNotInstall } from '../errors/application-not-install';

export default (app: Application) => {
  app
    .command('start')
    .auth()
    .option('--db-sync')
    .option('--quickstart')
    .action(async (...cliArgs) => {
      const [options] = cliArgs;
      app.logger.debug('start options', options);
      const file = resolve(process.cwd(), 'storage/app-upgrading');
      const upgrading = await fsExists(file);
      if (upgrading) {
        await app.upgrade();
        await fs.promises.rm(file);
      } else if (options.quickstart) {
        if (await app.isInstalled()) {
          await app.upgrade();
        } else {
          await app.install();
        }

        app['_started'] = true;
        await app.restart();
        app.logger.info('app has been started');
        return;
      }
      if (!(await app.isInstalled())) {
        app['_started'] = true;
        throw new ApplicationNotInstall(
          `Application ${app.name} is not installed, Please run 'pnpm tachybase install' command first`,
        );
      }
      await app.load();
      await app.start({
        dbSync: options?.dbSync,
        quickstart: options.quickstart,
        cliArgs,
        checkInstall: true,
      });
      app.logger.info(`app has been started at ${performance.now().toFixed(2)} ms`);
    });
};
