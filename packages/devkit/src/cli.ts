#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';
import semver from 'semver';

import commands from './commands';
import { __dirname } from './constants';
import { genTsConfigPaths, initEnv } from './util';

import './notify-updates';

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const cli = new Command();

cli.version(require('../package.json').version);

initEnv();
genTsConfigPaths();

commands(cli).then(() => {
  if (semver.satisfies(process.version, '<20')) {
    console.error(chalk.red('[tachybase cli]: Node.js version must be >= 20'));
    process.exit(1);
  }

  cli.parse(process.argv);
});
