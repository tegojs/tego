import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import yoctoSpinner from '@socketregistry/yocto-spinner/index.cjs';
import execa from 'execa';

import { DEFAULT_BUILTIN_PLUGINS_RELATIVE_PATH, DEFAULT_WEB_PACKAGE_NAME } from './constants';
import { defaultModules } from './default-modules';
import { defaultPlugins } from './default-plugins';
import { downloadTar, initEnvFile } from './utils';

export async function prepare({
  name,
  plugins = defaultPlugins,
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
    initEnvFile(name);
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

  const prefix = path.join(name, DEFAULT_BUILTIN_PLUGINS_RELATIVE_PATH);
  // 安装前端代码
  console.log('🚀 ~ start download ~ front end files');
  const spinner = yoctoSpinner({ text: `Loading ${DEFAULT_WEB_PACKAGE_NAME}` }).start();
  await downloadTar(DEFAULT_WEB_PACKAGE_NAME, `${prefix}/${DEFAULT_WEB_PACKAGE_NAME}`);
  spinner.success();
  console.log();

  console.log('🚀 ~ start download ~ required modules');
  // 安装必须得模块
  const moduleNames = defaultModules.map((moduleName) => `@tachybase/module-${moduleName}`);
  let index = 1;
  for (const moduleName of moduleNames) {
    const spinner = yoctoSpinner({ text: `[${index++}/${moduleNames.length}] Loading ${moduleName}` }).start();
    await downloadTar(moduleName, `${prefix}/${moduleName}`);
    if (npmExist) {
      await npmInstall(`${prefix}/${moduleName}`, spinner);
    }
    spinner.success();
  }
  console.log();

  console.log('🚀 ~ start download ~ plugins');
  // 安装可选的模块，由参数指定
  index = 1;
  const pluginNames = plugins.map((pluginName: string) => `@tachybase/plugin-${pluginName}`);
  for (const pluginName of pluginNames) {
    const spinner = yoctoSpinner({ text: `[${index++}/${pluginNames.length}] Loading ${pluginName}` }).start();
    await downloadTar(pluginName, `${prefix}/${pluginName}`);
    if (npmExist) {
      await npmInstall(`${prefix}/${pluginName}`, spinner);
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
