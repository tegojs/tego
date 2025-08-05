#!/usr/bin/env node
import { createRequire } from 'node:module';

import { confirm, input } from '@inquirer/prompts';
import { Command } from 'commander';
import { execa, ExecaChildProcess } from 'execa';

const require = createRequire(import.meta.url);
const term = require('terminal-kit').terminal;

export default (cli: Command) => {
  cli
    .command('dev4')
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
      let logLines: string[] = [];
      let scrollPos = 0;
      console.log(term);

      function draw() {
        term.clear();
        const width = term.width;
        const height = term.height;
        const logHeight = height - 2;

        // draw logs
        for (let i = 0; i < logHeight; i++) {
          const line = logLines[scrollPos + i] ?? '';
          term.moveTo(1, 1 + i);
          term.eraseLine();
          term(line);
        }

        // divider
        term.moveTo(1, height - 1);
        term.gray('─'.repeat(width));

        // prompt
        term.moveTo(1, height);
        term.cyan('tegod> ');
      }

      function log(txt: string) {
        txt.split('\n').forEach((l) => {
          logLines.push(l);
        });
        scrollPos = Math.max(0, logLines.length - (term.height - 2));
        draw();
      }

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

      async function handleCommand(cmd: string) {
        cmd = cmd.trim();
        if (cmd === 'restart') {
          log('[dev] restarting...');
          proc?.kill();
          startProc();
        } else if (cmd === 'exit') {
          proc?.kill();
          process.exit(0);
        } else if (cmd === 'help') {
          log('Commands: restart, setup, help, exit, togglemouse');
        } else if (cmd === 'setup') {
          const port = await input({ message: 'Server port', default: String(opts.port) });
          const inspect = await confirm({ message: 'Enable inspect?', default: Boolean(opts.inspect) });
          const dbSync = await confirm({ message: 'Enable dbSync?', default: opts.dbSync });
          opts = { port: Number(port), inspect: inspect ? 9229 : false, dbSync };
          log('[setup] updated config. restarting...');
          proc?.kill();
          startProc();
        } else if (cmd === 'togglemouse') {
          mouseEnabled = !mouseEnabled;
          log(`[info] mouse support ${mouseEnabled ? 'enabled' : 'disabled'}`);
        } else {
          log(`[unknown] ${cmd}`);
        }
      }

      // setup terminal
      draw();
      startProc();

      const onMouse = (name, data) => {
        if (name === 'MOUSE_WHEEL_UP') {
          scrollPos = Math.max(0, scrollPos - 1);
        }
        if (name === 'MOUSE_WHEEL_DOWN') {
          scrollPos = Math.min(Math.max(0, logLines.length - (term.height - 2)), scrollPos + 1);
        }
        draw();
      };

      function toggleMouse() {
        mouseEnabled = !mouseEnabled;
        if (mouseEnabled) {
          term.grabInput({ mouse: 'motion' });
          term.on('mouse', onMouse);
          log('[info] Mouse wheel scroll enabled');
        } else {
          term.grabInput({ mouse: 'off' });
          term.off('mouse', onMouse);
          log('[info] Mouse wheel scroll disabled');
        }
        draw();
      }

      term.grabInput({ mouse: 'motion' });
      term.on('key', async (name, matches, data) => {
        log(`[DEBUG] ${name}`);
        if (name === 'CTRL_L') {
          toggleMouse();
        }
        // scroll
        if (name === 'PAGE_UP') {
          scrollPos = Math.max(0, scrollPos - 3);
          draw();
        }
        if (name === 'PAGE_DOWN') {
          scrollPos = Math.min(Math.max(0, logLines.length - (term.height - 2)), scrollPos + 3);
          draw();
        }
        if (name === 'CTRL_C') {
          proc?.kill();
          term.processExit();
        }
      });

      async function inputLoop() {
        term.moveTo('tegod> '.length + 1, term.height);
        term.inputField({ cancelable: true, autoComplete: ['exit'] }, async (err, value) => {
          if (value !== undefined) {
            await handleCommand(value);
          }
          inputLoop();
        });
      }
      inputLoop();
    });
};
