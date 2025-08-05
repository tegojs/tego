#!/usr/bin/env node
import React, { useEffect, useRef, useState } from 'react';

import * as inquirer from '@inquirer/prompts';
import { Command } from 'commander';
import { execa, ExecaChildProcess } from 'execa';
import { Box, render, Text } from 'ink';
import TextInput from 'ink-text-input';

// === 默认参数
const DEFAULTS = {
  inspect: false as boolean | number,
  port: 3000,
  dbSync: false,
};

const HelpText = `Commands:
 restart    Restart dev server
 setup      Run interactive setup
 help       Show this help
 exit       Quit
`;

const runDevProcess = (opts: { inspect: boolean | number; port: number; dbSync: boolean }) => {
  const { inspect, port, dbSync } = opts;
  const argv: string[] = [
    'watch',
    ...(inspect ? [`--inspect=${inspect === true ? 9229 : inspect}`] : []),
    '--ignore=./storage/plugins/**',
    '--tsconfig',
    'SERVER_TSCONFIG_PATH',
    '-r',
    'tsconfig-paths/register',
    `${process.cwd()}/src/index.ts`,
    'start',
    `--port=${port}`,
  ];

  if (dbSync) {
    argv.push('--db-sync');
  }

  const child = execa('node', ['./node_modules/tsx/dist/cli.mjs', ...argv], {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
    env: {
      ...process.env,
      APP_PORT: String(port),
    },
  });

  return child;
};

// ================= Ink UI ===================
const DevUI: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [cmd, setCmd] = useState('');
  const [proc, setProc] = useState<ExecaChildProcess | null>(null);
  const [opts, setOpts] = useState(DEFAULTS);

  const startProcess = () => {
    const child = runDevProcess(opts);
    setProc(child);

    child.stdout?.on('data', (d) => {
      setLogs((l) => [...l, d.toString()]);
    });
    child.stderr?.on('data', (d) => {
      setLogs((l) => [...l, d.toString()]);
    });

    child.on('exit', (c) => {
      if (c === 100) {
        appendLog('[dev] exited with 100, restarting...');
        setTimeout(() => {
          startProcess();
        }, 300);
      } else {
        appendLog(`[dev] exited (${c})`);
      }
    });
  };

  const appendLog = (msg: string) => {
    setLogs((l) => [...l, msg]);
  };

  // useEffect(() => {
  //   startProcess();
  //   return () => {
  //     proc?.kill();
  //   };
  // }, []);

  const restart = () => {
    appendLog('[dev] restarting...');
    proc?.kill();
    startProcess();
  };

  const handleInput = async () => {
    const v = cmd.trim();
    if (!v) return;
    if (v === 'restart') {
      restart();
    } else if (v === 'exit') {
      proc?.kill();
      process.exit(0);
    } else if (v === 'help') {
      appendLog(HelpText);
    } else if (v === 'setup') {
      const answers: any = {};
      answers.port = await inquirer.input({
        message: 'Server port',
        default: String(opts.port),
      });
      answers.inspect = await inquirer.confirm({
        message: 'Enable inspect (9229)?',
        default: Boolean(opts.inspect),
      });
      answers.dbSync = await inquirer.confirm({
        message: 'Enable dbSync?',
        default: Boolean(opts.dbSync),
      });
      setOpts({
        port: Number(answers.port),
        inspect: answers.inspect ? 9229 : false,
        dbSync: answers.dbSync,
      });
      appendLog('[setup] updated config. Restarting dev server...');
      restart();
    } else {
      appendLog(`[unknown] command: ${v}`);
    }
    setCmd('');
  };

  return (
    <Box flexDirection="column" height="100%">
      <Box flexGrow={1} borderStyle="round" flexDirection="column" paddingX={1}>
        {logs.slice(-17).map((l, i) => (
          <Text key={i}>{l}</Text>
        ))}
      </Box>
      <Box height={3} paddingX={1} flexShrink={0}>
        <Text>cmd&gt; </Text>
        <TextInput value={cmd} onChange={setCmd} onSubmit={handleInput} />
      </Box>
    </Box>
  );
};

export default (cli: Command) => {
  cli
    .command('dev2')
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
      render(<DevUI />);
    });
};
