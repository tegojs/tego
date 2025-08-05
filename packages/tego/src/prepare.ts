import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import yoctoSpinner from '@socketregistry/yocto-spinner/index.cjs';
import execa from 'execa';

import { DEFAULT_BUILTIN_PLUGINS_PATH, DEFAULT_WEB_PACKAGE_NAME, INDEX_TEGO_URL } from './constants';
import { downloadTar, TegoIndexManager } from './utils';

export async function prepare({
  name,
  plugins = [],
  init = false,
}: {
  name?: string;
  plugins: string[];
  init?: boolean;
}) {
  if (init) {
    if (fs.existsSync(name)) {
      console.log(`project folder ${name} already exists, exit now.`);
      return;
    }
    fs.mkdirSync(name);
  } else {
    name = process.cwd();
  }

  let npmExist = true;
  // 判断 npm 是否存在
  try {
    await execa('npm', ['--version']);
  } catch {
    npmExist = false;
  }

  // 安装前端代码
  console.log('🚀 ~ start download ~ front end files');
  const spinner = yoctoSpinner({ text: `Loading ${DEFAULT_WEB_PACKAGE_NAME}` }).start();
  await downloadTar(DEFAULT_WEB_PACKAGE_NAME, `${DEFAULT_BUILTIN_PLUGINS_PATH}/${DEFAULT_WEB_PACKAGE_NAME}`);
  spinner.success();
  console.log();

  console.log('🚀 ~ start download ~ plugins');
  const manager = new TegoIndexManager({
    indexUrl: INDEX_TEGO_URL,
    baseDir: process.env.TEGO_HOME!,
  });
  const pluginIndex = await manager.getIndex();
  // download plugins
  const pluginNames = plugins.length > 0 ? plugins : pluginIndex.plugins.map((plugin: { name: string }) => plugin.name);
  let index = 1;
  for (const pluginName of pluginNames) {
    const spinner = yoctoSpinner({ text: `[${index++}/${pluginNames.length}] Loading ${pluginName}` }).start();
    await downloadTar(pluginName, `${DEFAULT_BUILTIN_PLUGINS_PATH}/${pluginName}`);
    if (npmExist) {
      await npmInstall(`${DEFAULT_BUILTIN_PLUGINS_PATH}/${pluginName}`, spinner);
    }
    spinner.success();
  }
  console.log();
}

export async function npmInstall(target: string, spinner: yoctoSpinner.Spinner) {
  // check "dependencies" field exists
  const packageJsonPath = path.join(target, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  if (!packageJson.dependencies || Object.keys(packageJson.dependencies).length === 0) {
    return;
  }
  const originalText = spinner.text;
  spinner.text += ' [installing deps]';
  await execa('npm', ['install', '--omit', 'dev', '--legacy-peer-deps'], {
    stdio: 'inherit',
    cwd: target,
    env: {
      npm_config_loglevel: 'error',
      ...process.env,
    },
  });
  spinner.text = originalText;
}
