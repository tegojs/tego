import fs from 'node:fs';
import path from 'node:path';

import { confirm, input, select } from '@inquirer/prompts';
import { createRsbuild, loadConfig } from '@rsbuild/core';
import { Command } from 'commander';
import { getPortPromise } from 'portfinder';
import simpleGit from 'simple-git';

import { fsExists, postCheck, promptForTs, run, runAppCommand } from '../util';

async function prepare() {
  const git = simpleGit();
  const branch = (await git.branch()).current;
  let runtime = branch.replace(/\//g, '__');
  let runtimeDir = path.resolve(process.env.TEGO_HOME!, runtime);
  let settingsFile = path.join(runtimeDir, 'settings.js');

  console.log(process.env.TEGO_HOME);

  const result = [];
  const rootDir = process.env.TEGO_HOME!;

  let runtimeIncludes = false;

  for (const entry of fs.readdirSync(rootDir)) {
    const fullPath = path.join(rootDir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      const settingsPath = path.join(fullPath, 'settings.js');
      if (fs.existsSync(settingsPath)) {
        if (fullPath === runtimeDir) {
          runtimeIncludes = true;
        }
        result.push(entry);
      }
    }
  }
  // 如果当前路径下包含 storage，则把当前目录也放进去
  if (fs.existsSync(path.join(process.cwd(), 'storage'))) {
    result.push(process.cwd());
  }

  if (!runtimeIncludes) {
    result.push('以当前分支创建目录');
  }
  result.push('创建新的配置目录，请指定');

  const selected = await select({
    message: '请选择一个目录',
    default: runtimeIncludes ? runtime : process.cwd(),
    choices: result.map((item) => ({
      name: item,
      value: item,
    })),
  });

  // 如果选择已经存在的运行时，那就直接走接下去的逻辑
  if (selected === runtime) {
    process.env.TEGO_RUNTIME_NAME = runtime;
    process.env.TEGO_RUNTIME_HOME = runtimeDir;
    return;
  } else if (selected === '创建新的配置目录，请指定') {
    // 如果选择的是创建新的配置目录
    runtime = await input({
      message: '请输入新的配置目录',
    });
    if (!runtime) {
      console.log('请输入新的配置目录');
      process.exit(1);
    }
    runtimeDir = path.resolve(process.env.TEGO_HOME!, runtime);
    settingsFile = path.join(runtimeDir, 'settings.js');
  } else if (selected === '以当前分支创建目录') {
    // do nothing here
  } else if (selected === process.cwd()) {
    process.env.TEGO_RUNTIME_NAME = '__NO_RUNTIME_NAME__';
    process.env.TEGO_RUNTIME_HOME = process.cwd();
  } else {
    // 其他目录
    process.env.TEGO_RUNTIME_NAME = selected;
    process.env.TEGO_RUNTIME_HOME = path.join(process.env.TEGO_HOME!, selected);
    return;
  }

  // 判断是否已经存在配置
  if (!fs.existsSync(settingsFile)) {
    const answer = await confirm({
      message: `环境 "${runtime}" 尚未初始化，是否要初始化？`,
      default: true,
    });

    if (!answer) {
      console.log('已取消初始化');
      process.exit(1);
    }

    // 调安装
    process.env.TEGO_RUNTIME_NAME = runtime;
    process.env.TEGO_RUNTIME_HOME = runtimeDir;
    await runAppCommand('init', []);

    // 再次确认
    const ok = await confirm({
      message: `请修改 ${settingsFile}，调整相关配置，确认后下一步`,
      default: true,
    });

    if (!ok) {
      console.log('请完成修改后再运行 pnpm dev');
      process.exit(1);
    }

    // 安装应用
    await runAppCommand('install', ['-f']);
  }
}

export default (cli: Command) => {
  cli
    .command('dev')
    .option('--no-prepare', 'skip prepare')
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

      if (!SERVER_TSCONFIG_PATH) {
        throw new Error('SERVER_TSCONFIG_PATH is not set.');
      }

      try {
        if (opts.prepare) {
          await prepare();
        }
      } catch (error) {
        process.exit(1);
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
        if (!APP_CLIENT_ROOT || !(await fsExists(APP_CLIENT_ROOT))) {
          return;
        }
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
