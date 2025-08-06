import path from 'node:path';
import TachybaseGlobal from '@tachybase/globals';

export const getLoggerLevel = () => TachybaseGlobal.settings.logger.level ?? 'info';

export const getLoggerFilePath = (...paths: string[]): string => {
  return path.resolve(
    path.resolve(process.env.TEGO_RUNTIME_HOME, TachybaseGlobal.settings.logger.basePath ?? 'storage/logs'),
    ...paths,
  );
};

export const getLoggerTransport = (): ('console' | 'file' | 'dailyRotateFile')[] =>
  TachybaseGlobal.settings.logger.transport ?? ['console', 'dailyRotateFile'];

export const getLoggerFormat = (): 'logfmt' | 'json' | 'delimiter' | 'console' =>
  TachybaseGlobal.settings.logger.format ?? 'console';
