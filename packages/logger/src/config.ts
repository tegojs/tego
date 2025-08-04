import path from 'node:path';

export const getLoggerLevel = () =>
  process.env.LOGGER_LEVEL || (process.env.APP_ENV === 'development' ? 'debug' : 'info');

export const getLoggerFilePath = (...paths: string[]): string => {
  return path.resolve(
    path.resolve(process.env.TEGO_RUNTIME_HOME, process.env.LOGGER_BASE_PATH ?? 'storage/logs'),
    ...paths,
  );
};

export const getLoggerTransport = (): ('console' | 'file' | 'dailyRotateFile')[] =>
  ((process.env.LOGGER_TRANSPORT as any) || 'console,dailyRotateFile').split(',');

export const getLoggerFormat = (): 'logfmt' | 'json' | 'delimiter' | 'console' =>
  (process.env.LOGGER_FORMAT as any) || (process.env.APP_ENV === 'development' ? 'console' : 'json');
