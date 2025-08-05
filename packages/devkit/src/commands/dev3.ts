import { confirm, input } from '@inquirer/prompts';
import { Command } from 'commander';
import { execa, ExecaChildProcess } from 'execa';
import blessed from 'neo-blessed';

export default (cli: Command) => {
  cli
    .command('dev3')
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
    .action(async () => {
      const DEFAULTS = {
        inspect: false,
        port: 3000,
        dbSync: false,
      };

      let proc: ExecaChildProcess;
      let opts = { ...DEFAULTS };
      let mouseEnabled = false;

      // -- 启动子进程
      function startProc() {
        const args = [
          'watch',
          ...(opts.inspect ? [`--inspect=${opts.inspect === true ? 9229 : opts.inspect}`] : []),
          '--ignore=./storage/plugins/**',
          '--tsconfig',
          process.env.SERVER_TSCONFIG_PATH,
          '-r',
          'tsconfig-paths/register',
          `${process.env.APP_SERVER_ROOT}/src/index.ts`,
          'start',
          `--port=${opts.port}`,
        ];
        if (opts.dbSync) args.push('--db-sync');

        log(`[dev] starting ${args.join(' ')}`);

        proc = execa('node', ['./node_modules/tsx/dist/cli.mjs', ...args], {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
          env: { ...process.env, APP_PORT: String(opts.port), FORCE_COLOR: '1' },
        });

        proc.stdout?.on('data', (d) => log(d.toString()));
        proc.stderr?.on('data', (d) => log(d.toString()));
        proc.on('exit', (code) => {
          if (code === 100) {
            log('[dev] exited 100, restarting...');
            startProc();
          } else {
            log(`[dev] exited (${code})`);
          }
        });
      }

      // ----- blessed UI ------------
      const screen = blessed.screen({
        smartCSR: true,
        title: 'tegod dev',
        fullUnicode: true,
      });

      const logBox = blessed.box({
        top: 0,
        left: 0,
        width: '100%',
        height: '100%-2',
        // border: 'line',
        keys: true,
        mouse: mouseEnabled,
        scrollable: true,
        alwaysScroll: true,
        tags: true,
        useAnsi: true,
        scrollbar: { ch: ' ', track: { bg: 'gray' }, style: { bg: 'white' } },
      });

      // 分割线
      const divider = blessed.line({
        top: '100%-2',
        left: 0,
        orientation: 'horizontal',
        width: '100%',
        style: { fg: 'gray' },
        ch: '─',
      });

      // 提示符
      const promptLabel = blessed.text({
        bottom: 0,
        left: 0,
        height: 1,
        width: 8, // tegod>  6 个字符 + 空格
        content: 'tegod> ',
        style: { fg: 'cyan' },
      });

      const cmdInput = blessed.textbox({
        bottom: 0,
        height: 1,
        inputOnFocus: true,
        // border: 'line',
        left: 7,
        width: '100% - 7',
        style: {
          fg: 'white', // 白色字体
          bg: 'black', // 黑色背景，或者根据你的终端背景调
          focus: {
            fg: 'white',
            bg: 'blue', // 聚焦时背景色变蓝，更明显
          },
        },
        padding: { left: 1 },
      });

      screen.append(logBox);
      screen.append(divider);
      // screen.append(promptLabel);

      screen.append(cmdInput);

      // TODO 无效
      screen.key(['C-c'], () => process.exit(0));

      function log(txt) {
        logBox.pushLine(txt.replace(/\n$/, ''));
        logBox.setScrollPerc(100);
        screen.render();
      }

      async function handleCommand(v) {
        const cmd = v.trim();
        if (cmd === 'restart') {
          log('[dev] restarting...');
          proc?.kill();
          startProc();
        } else if (cmd === 'exit') {
          proc?.kill();
          process.exit(0);
        } else if (cmd === 'help') {
          log('Commands: restart, setup, help, exit');
        } else if (cmd === 'setup') {
          const port = await input({ message: 'Server port', default: String(opts.port) });
          const inspect = await confirm({ message: 'Enable inspect?', default: opts.inspect });
          const dbSync = await confirm({ message: 'Enable dbSync?', default: opts.dbSync });
          opts = { port: Number(port), inspect: inspect ? 9229 : false, dbSync };
          log('[setup] updated config. restarting...');
          proc?.kill();
          startProc();
        } else if (cmd === 'togglemouse') {
          if (mouseEnabled) {
            logBox.disableMouse();
          } else {
            logBox.enableMouse();
          }
          mouseEnabled = !mouseEnabled;
          screen.render();
          log(`[info] mouse support ${mouseEnabled ? 'enabled' : 'disabled'}`);
        } else {
          log(`[unknown] ${cmd}`);
        }

        cmdInput.clearValue();
        screen.render();
        cmdInput.focus();
      }

      cmdInput.on('submit', handleCommand);

      // 自动聚焦到输入框
      cmdInput.focus();

      screen.render();
      startProc();
    });
};
