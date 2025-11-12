import type { Tego } from '@tego/core';

import { getDatabaseOrThrow } from './utils';

export default (app: Tego) => {
  app
    .command('db:auth')
    .option('-r, --retry [retry]')
    .action(async (opts) => {
      const db = getDatabaseOrThrow(app);
      await db.auth({ retry: opts.retry || 10 });
    });
};
