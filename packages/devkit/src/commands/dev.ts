import { createRsbuild, loadConfig } from '@rsbuild/core';
import { Command } from 'commander';
import { getPortPromise } from 'portfinder';

import { nodeCheck, postCheck, promptForTs, run } from '../util';

export default (cli: Command) => {
  cli
    .command('dev')
    .option('-p, --port [port]')
    .option('--proxy-port [port]')
    .option('--client')
    .option('--server')
    .option('--rs')
    .option('-w, --wait-server')
    .option('--no-open')
    .option('--db-sync')
    .option('--inspect [port]')
    .allowUnknownOption()
    .action(async (opts) => {
      promptForTs();
      const { APP_SERVER_ROOT, APP_CLIENT_ROOT, SERVER_TSCONFIG_PATH } = process.env;
      // @ts-ignore
      process.env.IS_DEV_CMD = true;

      if (!SERVER_TSCONFIG_PATH) {
        throw new Error('SERVER_TSCONFIG_PATH is not set.');
      }

      if (process.argv.includes('-h') || process.argv.includes('--help')) {
        run('tsx', [
          '--tsconfig',
          SERVER_TSCONFIG_PATH,
          '-r',
          'tsconfig-paths/register',
          `${APP_SERVER_ROOT}/src/index.ts`,
          ...process.argv.slice(2),
        ]);
        return;
      }

      const { port, client, server, inspect, rs } = opts;

      if (port) {
        process.env.APP_PORT = opts.port;
      }

      const { APP_PORT } = process.env;

      let clientPort = 0;
      let serverPort = 0;

      if (APP_PORT) {
        clientPort = Number(APP_PORT);
      }

      nodeCheck();

      await postCheck(opts);

      if (server) {
        serverPort = Number(APP_PORT!);
      } else if (!server && !client) {
        serverPort = await getPortPromise({
          port: 1 * clientPort + 10,
        });
      }

      if (server || !client) {
        console.log('starting server', serverPort);

        const filteredArgs = process.argv.filter(
          (item, i) => !item.startsWith('--inspect') && !(process.argv[i - 1] === '--inspect' && Number.parseInt(item)),
        );

        const argv = [
          'watch',
          ...(inspect ? [`--inspect=${inspect === true ? 9229 : inspect}`] : []),
          '--ignore=./storage/plugins/**',
          '--tsconfig',
          SERVER_TSCONFIG_PATH,
          '-r',
          'tsconfig-paths/register',
          `${APP_SERVER_ROOT}/src/index.ts`,
          'start',
          ...filteredArgs.slice(3),
          `--port=${serverPort}`,
        ];

        if (opts.dbSync) {
          argv.push('--db-sync');
        }

        const runDevServer = () => {
          run('tsx', argv, {
            env: {
              APP_PORT: serverPort + '',
            },
          }).catch((err) => {
            if (err.exitCode === 100) {
              console.log('Restarting server...');
              runDevServer();
            } else {
              console.error(err);
            }
          });
        };

        runDevServer();
      }

      if (client || !server) {
        const runClient = async () => {
          const getDevEnvironment = (clientPort: number, proxyPort: number) => ({
            PORT: clientPort + '',
            NO_OPEN: opts.open ? undefined : '1',
            WEBSOCKET_URL:
              process.env.WEBSOCKET_URL ||
              (proxyPort ? `ws://localhost:${proxyPort}${process.env.WS_PATH}` : undefined),
            PROXY_TARGET_URL: process.env.PROXY_TARGET_URL || (proxyPort ? `http://127.0.0.1:${proxyPort}` : undefined),
          });

          const proxyPort = opts.proxyPort || serverPort || clientPort + 10;
          console.log('starting client', 1 * clientPort, 'proxy port', proxyPort);
          const env = getDevEnvironment(clientPort, proxyPort);
          process.env.PORT = env.PORT;
          process.env.NO_OPEN = env.NO_OPEN;
          process.env.WEBSOCKET_URL = env.WEBSOCKET_URL;
          process.env.PROXY_TARGET_URL = env.PROXY_TARGET_URL;
          process.env.NODE_ENV = 'development';
          const config = await loadConfig({
            cwd: APP_CLIENT_ROOT,
          });
          const rsbuild = await createRsbuild({
            rsbuildConfig: config.content,
            cwd: APP_CLIENT_ROOT,
          });
          await rsbuild.startDevServer();
        };

        async function runMqServer() {
          const proxyPort = opts.proxyPort || serverPort || clientPort + 10;
          const targetUrl = process.env.PROXY_TARGET_URL || (proxyPort ? `http://127.0.0.1:${proxyPort}` : undefined);
          try {
            const result = await fetch(`${targetUrl}/api/__health_check`);
            const res = await result.text();
            if (res !== 'ok') {
              throw new Error('server not ready');
            }
            await runClient();
          } catch {
            setTimeout(() => {
              runMqServer();
            }, 500);
          }
        }

        if (opts.waitServer) {
          runMqServer();
        } else {
          runClient();
        }
      }
    });
};
