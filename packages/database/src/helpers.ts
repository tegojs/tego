import fs from 'node:fs';
import TachybaseGlobal from '@tachybase/globals';

import semver from 'semver';

import { Database, IDatabaseOptions } from './database';

function isFilePath(value) {
  return fs.promises
    .stat(value)
    .then((stats) => stats.isFile())
    .catch((err) => {
      if (err.code === 'ENOENT') {
        return false;
      }

      throw err;
    });
}

function getValueOrFileContent(value?: string | boolean) {
  if (!value) {
    return Promise.resolve(null);
  }

  if (typeof value === 'boolean') {
    return Promise.resolve(value);
  }

  return isFilePath(value)
    .then((isFile) => {
      if (isFile) {
        return fs.promises.readFile(value, 'utf8');
      }
      return value;
    })
    .catch((error) => {
      console.error(`Failed to read file content for value.`);
      throw error;
    });
}

function extractSSLOptionsFromEnv() {
  return Promise.all([
    getValueOrFileContent(TachybaseGlobal.settings.database.ssl?.mode),
    getValueOrFileContent(TachybaseGlobal.settings.database.ssl?.ca),
    getValueOrFileContent(TachybaseGlobal.settings.database.ssl?.key),
    getValueOrFileContent(TachybaseGlobal.settings.database.ssl?.cert),
    getValueOrFileContent(TachybaseGlobal.settings.database.ssl?.rejectUnauthorized),
  ]).then(([mode, ca, key, cert, rejectUnauthorized]) => {
    const sslOptions = {};

    if (mode) sslOptions['mode'] = mode;
    if (ca) sslOptions['ca'] = ca;
    if (key) sslOptions['key'] = key;
    if (cert) sslOptions['cert'] = cert;
    if (rejectUnauthorized) sslOptions['rejectUnauthorized'] = rejectUnauthorized === 'true';

    return sslOptions;
  });
}

export async function parseDatabaseOptionsFromEnv(): Promise<IDatabaseOptions> {
  const databaseOptions: IDatabaseOptions = {
    logging: TachybaseGlobal.settings.database.logging ? customLogger : false,
    dialect: TachybaseGlobal.settings.database.dialect,
    storage: TachybaseGlobal.settings.database.storage,
    username: TachybaseGlobal.settings.database.user,
    password: TachybaseGlobal.settings.database.password,
    database: TachybaseGlobal.settings.database.database,
    host: TachybaseGlobal.settings.database.host,
    port: TachybaseGlobal.settings.database.port,
    timezone: TachybaseGlobal.settings.database.timezone,
    tablePrefix: TachybaseGlobal.settings.database.tablePrefix,
    schema: TachybaseGlobal.settings.database.schema,
    underscored: TachybaseGlobal.settings.database.underscored,
  };

  const sslOptions = await extractSSLOptionsFromEnv();

  if (Object.keys(sslOptions).length) {
    databaseOptions.dialectOptions = databaseOptions.dialectOptions || {};
    databaseOptions.dialectOptions['ssl'] = sslOptions;
  }

  return databaseOptions;
}

function customLogger(queryString, queryObject) {
  console.log(queryString);
  if (queryObject?.bind) {
    console.log(queryObject.bind);
  }
}

const dialectVersionAccessors = {
  sqlite: {
    sql: 'select sqlite_version() as version',
    get: (v: string) => v,
    version: '3.x',
  },
  mysql: {
    sql: 'select version() as version',
    get: (v: string) => {
      const m = /([\d+.]+)/.exec(v);
      return m[0];
    },
    version: '>=8.0.17',
  },
  mariadb: {
    sql: 'select version() as version',
    get: (v: string) => {
      const m = /([\d+.]+)/.exec(v);
      return m[0];
    },
    version: '>=10.9',
  },
  postgres: {
    sql: 'select version() as version',
    get: (v: string) => {
      const m = /([\d+.]+)/.exec(v);
      return semver.minVersion(m[0]).version;
    },
    version: '>=10',
  },
};

export async function checkDatabaseVersion(db: Database) {
  const dialect = db.sequelize.getDialect();
  const accessor = dialectVersionAccessors[dialect];
  if (!accessor) {
    throw new Error(`unsupported dialect ${dialect}`);
  }

  const result = await db.sequelize.query(accessor.sql, {
    type: 'SELECT',
  });

  // @ts-ignore
  const version = accessor.get(result?.[0]?.version);
  const versionResult = semver.satisfies(version, accessor.version);
  if (!versionResult) {
    throw new Error(`to use ${dialect}, please ensure the version is ${accessor.version}`);
  }

  return true;
}
