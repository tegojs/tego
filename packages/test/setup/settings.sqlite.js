const defaultSettings = require('../../tego/presets/settings');

/** @type {import('@tachybase/globals').Settings} */
module.exports = {
  ...defaultSettings,

  logger: {
    ...defaultSettings.logger,
    level: 'error',
  },
};
