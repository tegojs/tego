import './preload';

import { performance } from 'node:perf_hooks';
import TachybaseGlobal from '@tachybase/globals';
import { Gateway } from '@tachybase/server';
import { createDevPluginsSymlink, createStoragePluginsSymlink } from '@tachybase/utils';

import { Command } from 'commander';

import { getConfig } from './config';
import PluginPresets from './plugin-presets';
import { prepare } from './prepare';
import { parseEnvironment } from './utils';

// 解析环境变量
parseEnvironment();

const program = new Command();
program.name('tachybase-engine').version(require('../package.json').version);

const run = async () => {
  // 注册 presets 插件
  TachybaseGlobal.getInstance().set('PRESETS', {
    tachybase: PluginPresets,
  });

  // 初始化插件链接
  await createDevPluginsSymlink();
  await createStoragePluginsSymlink();

  console.log(`Engine loaded at ${performance.now().toFixed(2)} ms`);
  await Gateway.getInstance().run({
    mainAppOptions: (await getConfig()) as any,
  });
};

// default action
program.allowUnknownOption().action(async () => {
  await run();
});

program
  .command('init')
  .description('init a tachybase application project')
  .option('--plugins <list>', 'Comma-separated list of plugins to install', (value) => {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  })
  .argument('[name]', 'project name or path', 'my-app')
  .action(async (name, options) => {
    await prepare({ name, plugins: options.plugins, init: true });
  });

program
  .command('sync')
  .description('sync latest packages in current project')
  .option('--plugins <list>', 'Comma-separated list of plugins to sync', (value) => {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  })
  .action(async (options) => {
    await prepare({ plugins: options.plugins });
  });

program.parse();
