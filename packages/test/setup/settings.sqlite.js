const path = require('node:path');
const os = require('node:os');
const defaultSettings = require('../../tego/presets/settings');

// Generate a unique database name for each test run to avoid data leakage between tests
const testDbName = `test-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`;

/** @type {import('@tachybase/globals').Settings} */
module.exports = {
  ...defaultSettings,

  // Override environment settings for tests
  env: {
    ...defaultSettings.env,
    APP_ENV: 'test', // Use 'test' instead of 'development' to avoid throwing errors in plugin resolution
  },

  logger: {
    ...defaultSettings.logger,
    level: 'error',
  },

  database: {
    ...defaultSettings.database,
    // Use a unique file-based SQLite database in temp directory for each test run
    // This allows data persistence across app.reload() calls while avoiding data leakage between test files
    storage: path.join(os.tmpdir(), 'tego-test', testDbName),
  },
};
