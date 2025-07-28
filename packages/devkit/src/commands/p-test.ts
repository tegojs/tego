import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parse } from 'dotenv';
import { execa } from 'execa';
import fastGlob from 'fast-glob';
import lodash from 'lodash';
import pAll from 'p-all';

async function runApp(dir: string, index = 0) {
  let ENV_FILE = resolve(process.cwd(), '.env.e2e');

  if (!existsSync(ENV_FILE)) {
    ENV_FILE = resolve(process.cwd(), '.env.e2e.example');
  }

  const data = readFileSync(ENV_FILE, 'utf-8');
  const config = {
    ...parse(data),
    ...process.env,
  };
  // 一个进程需要占用两个端口? (一个是应用端口，一个是 socket 端口)
  index = index * 2;
  const { Client } = require('pg');
  const database = `tachybase${index}`;
  const client = new Client({
    host: config['DB_HOST'],
    port: Number(config['DB_PORT']),
    user: config['DB_USER'],
    password: config['DB_PASSWORD'],
    database: 'postgres',
  });
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS "${database}"`);
  await client.query(`CREATE DATABASE "${database}";`);
  await client.end();
  return execa('pnpm', ['tachybase', 'e2e', 'test', dir, '--skip-reporter'], {
    shell: true,
    stdio: 'inherit',
    env: {
      ...config,
      CI: process.env.CI,
      __E2E__: true + '',
      APP_BASE_URL: undefined,
      LOGGER_LEVEL: 'error',
      APP_ENV: 'production',
      APP_PORT: 20000 + index + '',
      DB_DATABASE: `tachybase${index}`,
      SOCKET_PATH: `storage/e2e/gateway-e2e-${index}.sock`,
      PM2_HOME: resolve(process.cwd(), `storage/e2e/.pm2-${index}`),
      PLAYWRIGHT_AUTH_FILE: resolve(process.cwd(), `storage/playwright/.auth/admin-${index}.json`),
    },
  });
}

export async function pTest(options: any) {
  const dir = resolve(process.cwd(), 'storage/e2e');

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const files = fastGlob.sync(options.match, {
    ignore: options.ignore,
    // @ts-ignore
    root: process.cwd(),
  });

  const commands = splitArrayIntoParts(lodash.shuffle(files), options.concurrency || 4).map((v, i) => {
    return () => runApp(v.join(' '), i);
  });

  await pAll(commands, { concurrency: 4, stopOnError: false, ...options });
}

function splitArrayIntoParts(array: any[], parts: number) {
  const chunkSize = Math.ceil(array.length / parts);
  return lodash.chunk(array, chunkSize);
}
