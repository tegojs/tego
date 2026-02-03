import os from 'node:os';
import path from 'node:path';
import TachybaseGlobal from '@tachybase/globals';
import { initEnv } from '@tego/devkit';

import settings from './settings.sqlite';

TachybaseGlobal.settings = settings;
// Initialize PLUGIN_PATHS for test environment with an empty array
// This prevents "pluginPaths is not iterable" errors when tests don't need actual plugin resolution
TachybaseGlobal.getInstance().set('PLUGIN_PATHS', []);
// process.env.DB_TEST_DISTRIBUTOR_PORT = '23450';
// process.env.DB_TEST_PREFIX = 'test';
process.env.TEGO_RUNTIME_HOME = path.join(os.tmpdir(), 'test-sqlite');

process.env.APP_ENV_PATH = process.env.APP_ENV_PATH || '.env.test';

initEnv();
