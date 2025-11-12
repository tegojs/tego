import type { Tego } from '@tego/core';

import { getDatabaseOrThrow } from './utils';

export default (app: Tego) => {
  app
    .command('db:clean')
    .auth()
    .option('-y, --yes')
    .action(async (opts) => {
      console.log('Clearing database');
      const db = getDatabaseOrThrow(app);
      await db.clean({
        drop: opts.yes,
      });
    });
};
