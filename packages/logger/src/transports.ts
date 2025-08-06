import path from 'node:path';
import TachybaseGlobal from '@tachybase/globals';

import winston from 'winston';
import { DailyRotateFileTransportOptions } from 'winston-daily-rotate-file';

import { getLoggerFilePath, getLoggerFormat, getLoggerTransport } from './config';
import { getFormat } from './format';
import { LoggerOptions } from './logger';

export const Transports = {
  console: (options?: winston.transports.ConsoleTransportOptions) => new winston.transports.Console(options),
  file: (options?: winston.transports.FileTransportOptions) =>
    new winston.transports.File({
      maxsize: Number(TachybaseGlobal.settings.logger.maxSize ?? 1024 * 1024 * 20),
      maxFiles: Number(TachybaseGlobal.settings.logger.maxFiles ?? 10),
      ...options,
    }),
  dailyRotateFile: (options?: DailyRotateFileTransportOptions) =>
    new winston.transports.DailyRotateFile({
      maxSize: TachybaseGlobal.settings.logger.maxSize,
      maxFiles: TachybaseGlobal.settings.logger.maxFiles ?? '14d',
      ...options,
    }),
};

export const getTransports = (options: LoggerOptions) => {
  const { filename, format: _format, transports: _transports } = options;
  let { dirname } = options;
  const configTransports = _transports || getLoggerTransport();
  const configFormat = _format || getLoggerFormat();
  dirname = dirname || getLoggerFilePath();
  if (!path.isAbsolute(dirname)) {
    dirname = path.resolve(process.cwd(), dirname);
  }
  const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    getFormat(configFormat),
  );

  const transports = {
    console: () =>
      Transports.console({
        format: winston.format.combine(format),
      }),
    file: () =>
      Transports.file({
        dirname,
        filename: filename.includes('.log') ? filename : `${filename}.log`,
        format,
      }),
    dailyRotateFile: () =>
      Transports.dailyRotateFile({
        dirname,
        filename: filename.includes('%DATE%') || filename.includes('.log') ? filename : `${filename}_%DATE%.log`,
        format,
      }),
  };
  return configTransports?.map((t) => (typeof t === 'string' ? transports[t]() : t)) || transports['console']();
};
