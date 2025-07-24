#!/usr/bin/env node
const chalk = require('chalk');

if (__dirname.startsWith('/snapshot/')) {
  console.log(chalk.green('WAIT: ') + 'Engine is loading...');
}

require('../lib/index.js');
