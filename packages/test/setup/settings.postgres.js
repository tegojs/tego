const defaultSettings = require('../../tego/presets/settings');

/** @type {import('@tachybase/globals').Settings} */
module.exports = {
  ...defaultSettings,

  logger: {
    ...defaultSettings.logger,
    level: 'error',
  },

  database: {
    dialect: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'tachybase',
    password: 'tachybase',
    underscored: false,
    timezone: '+00:00',
    ssl: {
      // ca: '',
      // key: '',
      // cert: '',
      // rejectUnauthorized: true,
    },
  },
};
