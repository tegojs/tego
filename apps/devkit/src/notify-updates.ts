import { createRequire } from 'node:module';

import updateNotifier from 'update-notifier';

const require = createRequire(import.meta.url);

updateNotifier({ pkg: require('../package.json') }).notify({ defer: true });
