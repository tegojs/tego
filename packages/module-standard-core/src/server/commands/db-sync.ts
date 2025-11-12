import type { Tego } from '@tego/core';

import { getDatabaseOrThrow } from './utils';

export default (app: Tego) => {
  app
    .command('db:sync')
    .auth()
    .preload()
    .action(async (...cliArgs) => {
      const [opts] = cliArgs;
      console.log('db sync...');

      const db = getDatabaseOrThrow(app);
      const Collection = db.getCollection('collections');
      if (Collection) {
        await Collection.repository.load();
      }

      const force = false;
      await db.sync({
        force,
        alter: {
          drop: force,
        },
      });
    });
};
