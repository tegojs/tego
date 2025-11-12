import { createSystemLogger, getLoggerFilePath } from '@tachybase/logger';
import type { Tego } from '@tego/core';

export const registerAdvancedLogger = (tego: Tego) => {
  const logger = createSystemLogger({
    dirname: getLoggerFilePath(tego.name),
    filename: 'system',
    seperateError: true,
  }).child({
    reqId: tego.reqId,
    app: tego.name,
    module: 'tego',
  });

  tego.setLogger(logger);
};
