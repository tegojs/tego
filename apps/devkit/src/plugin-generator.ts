import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { URL } from 'node:url';

import { Generator } from '@umijs/utils';
import chalk from 'chalk';
import { execa } from 'execa';

import { genTsConfigPaths } from './util';

const __dirname = new URL('.', import.meta.url).pathname;

function camelize(str: string) {
  return str.trim().replace(/[-_\s]+(.)?/g, (match, c) => c.toUpperCase());
}

function capitalize(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

async function getProjectVersion() {
  const content = await readFile(resolve(process.cwd(), 'package.json'), 'utf-8');
  const json = JSON.parse(content);
  return json.version || '0.1.0';
}

export class PluginGenerator extends Generator {
  context: any;
  log: any;
  constructor(options: any) {
    const { log, context = {}, ...opts } = options;
    super(opts);
    this.context = context;
    this.log = log || console.log;
  }

  async getContext() {
    const { name } = this.context;
    const packageVersion = await getProjectVersion();
    return {
      ...this.context,
      packageName: name,
      packageVersion,
      tachybaseVersion: '0.0.1',
      pascalCaseName: capitalize(camelize(name.split('/').pop())),
    };
  }

  async writing() {
    const name = this.context.name.split('/').pop();
    const target = resolve(process.cwd(), 'packages/', name);
    if (existsSync(target)) {
      this.log(chalk.red(`[${name}] plugin already exists.`));
      return;
    }
    this.log('Creating plugin');
    this.copyDirectory({
      target,
      context: await this.getContext(),
      path: join(__dirname, '../templates/plugin'),
    });
    this.log('');
    genTsConfigPaths();
    execa('pnpm', ['postinstall'], { shell: true, stdio: 'inherit' });
    this.log(`The plugin folder is in ${chalk.green(`packages/${name}`)}`);
  }
}
