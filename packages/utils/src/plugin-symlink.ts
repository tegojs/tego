import { readFileSync } from 'node:fs';
import { mkdir, readdir, symlink, unlink } from 'node:fs/promises';
import path, { join, resolve } from 'node:path';

import { fsExists } from './fs-exists';

async function getStoragePluginNames(target) {
  const plugins = [];
  const items = await readdir(target);
  for (const item of items) {
    if (item.startsWith('@')) {
      const children = await getStoragePluginNames(resolve(target, item));
      plugins.push(
        ...children.map((child) => {
          return `${item}/${child}`;
        }),
      );
    } else if (await fsExists(resolve(target, item, 'package.json'))) {
      plugins.push(item);
    }
  }
  return plugins;
}

export async function createStoragePluginSymLink(pluginName) {
  const storagePluginsPath = resolve(process.env.TEGO_RUNTIME_HOME, 'storage', 'plugins');
  const nodeModulesPath = resolve(process.env.TEGO_RUNTIME_HOME, 'plugins', 'remote');
  try {
    if (pluginName.startsWith('@')) {
      const [orgName] = pluginName.split('/');
      if (!(await fsExists(resolve(nodeModulesPath, orgName)))) {
        await mkdir(resolve(nodeModulesPath, orgName), { recursive: true });
      }
    }
    const link = resolve(nodeModulesPath, pluginName);
    if (await fsExists(link)) {
      await unlink(link);
    }
    await symlink(resolve(storagePluginsPath, pluginName), link, 'dir');
  } catch (error) {
    console.error(error);
  }
}

export async function createStoragePluginsSymlink() {
  const storagePluginsPath = resolve(process.env.TEGO_RUNTIME_HOME, 'storage/plugins');
  if (!(await fsExists(storagePluginsPath))) {
    return;
  }
  const pluginNames = await getStoragePluginNames(storagePluginsPath);
  await Promise.all(pluginNames.map((pluginName) => createStoragePluginSymLink(pluginName)));
}

export async function createDevPluginSymLink(pluginName: string) {
  const packagePluginsPath = resolve(process.cwd(), 'packages');
  const nodeModulesPath = resolve(process.cwd(), 'plugins', 'dev');
  try {
    const packageJson = JSON.parse(
      readFileSync(join(packagePluginsPath, pluginName, 'package.json'), { encoding: 'utf-8' }),
    );
    const fullname = packageJson.name;
    if (fullname.startsWith('@')) {
      const [orgName] = fullname.split('/');
      if (!(await fsExists(resolve(nodeModulesPath, orgName)))) {
        await mkdir(resolve(nodeModulesPath, orgName), { recursive: true });
      }
    }
    const link = resolve(nodeModulesPath, fullname);
    if (await fsExists(link)) {
      await unlink(link);
    }
    const target = resolve(packagePluginsPath, pluginName);
    const relativeTarget = path.relative(path.dirname(link), target);
    await symlink(relativeTarget, link, 'dir');
  } catch (error) {
    console.error(error);
  }
}

export async function createDevPluginsSymlink() {
  const storagePluginsPath = resolve(process.cwd(), 'packages');
  if (!(await fsExists(storagePluginsPath))) {
    return;
  }
  const pluginNames = await getStoragePluginNames(storagePluginsPath);
  await Promise.all(
    pluginNames
      .filter((pluginName: string) => pluginName.startsWith('plugin-') || pluginName.startsWith('module-'))
      .map((pluginName) => createDevPluginSymLink(pluginName)),
  );
}
