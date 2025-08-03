import fs from 'node:fs';
import path, { resolve } from 'node:path';
import TachybaseGlobal from '@tachybase/globals';
import { fsExists } from '@tachybase/utils';

export const PLUGIN_STATICS_PATH = '/static/plugins/';

function findPackageJson(filePath) {
  const directory = path.dirname(filePath);
  const packageJsonPath = path.resolve(directory, 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    return directory; // 返回找到的 package.json 所在目录
  } else if (directory !== '/') {
    // 递归寻找直到根目录
    return findPackageJson(directory);
  } else {
    throw new Error('package.json not found.');
  }
}

/**
 * get package.json path for specific NPM package
 * TODO：这里在支持多路径后逻辑不好维护
 */
export function getDepPkgPath(packageName: string, cwd?: string) {
  if (cwd) {
    try {
      return require.resolve(`${packageName}/package.json`, { paths: [cwd] });
    } catch {
      const mainFile = require.resolve(`${packageName}`, { paths: [cwd] });
      const packageDir = mainFile.slice(0, mainFile.indexOf(packageName.replace('/', path.sep)) + packageName.length);
      const result = path.join(packageDir, 'package.json');
      if (!fs.existsSync(result)) {
        return path.join(findPackageJson(mainFile), 'package.json');
      }
      return result;
    }
  } else {
    const pluginPaths = TachybaseGlobal.getInstance().get<string[]>('PLUGIN_PATHS');
    for (const basePath of pluginPaths) {
      if (!fs.existsSync(resolve(basePath, packageName))) {
        continue;
      }
      try {
        return require.resolve(`${resolve(basePath, packageName)}/package.json`);
      } catch {
        const mainFile = require.resolve(`${resolve(basePath, packageName)}`);
        const packageDir = mainFile.slice(0, mainFile.indexOf(packageName.replace('/', path.sep)) + packageName.length);
        const result = path.join(packageDir, 'package.json');
        if (!fs.existsSync(result)) {
          return path.join(findPackageJson(mainFile), 'package.json');
        }
        return result;
      }
    }
  }
}

export function getPackageDir(packageName: string) {
  const packageJsonPath = getDepPkgPath(packageName);
  return path.dirname(packageJsonPath);
}

export function getPackageFilePath(packageName: string, filePath: string) {
  const packageDir = getPackageDir(packageName);
  return path.join(packageDir, filePath);
}

export function getPackageFilePathWithExistCheck(packageName: string, filePath: string) {
  const absolutePath = getPackageFilePath(packageName, filePath);
  const exists = fs.existsSync(absolutePath);
  return {
    filePath: absolutePath,
    exists,
  };
}

export function getExposeUrl(packageName: string, filePath: string) {
  return `${process.env.PLUGIN_STATICS_PATH}${packageName}/${filePath}`;
}

export function getExposeReadmeUrl(packageName: string, lang: string) {
  let READMEPath = null;
  if (getPackageFilePathWithExistCheck(packageName, `README.${lang}.md`).exists) {
    READMEPath = `README.${lang}.md`;
  } else if (getPackageFilePathWithExistCheck(packageName, 'README.md').exists) {
    READMEPath = 'README.md';
  }

  return READMEPath ? getExposeUrl(packageName, READMEPath) : null;
}

export function getExposeChangelogUrl(packageName: string) {
  const { exists } = getPackageFilePathWithExistCheck(packageName, 'CHANGELOG.md');
  return exists ? getExposeUrl(packageName, 'CHANGELOG.md') : null;
}

/**
 * get package name by client static url
 *
 * @example
 * getPluginNameByClientStaticUrl('/static/plugins/dayjs/index.js') => 'dayjs'
 * getPluginNameByClientStaticUrl('/static/plugins/@tachybase/foo/README.md') => '@tachybase/foo'
 */
export function getPackageNameByExposeUrl(pathname: string) {
  pathname = pathname.replace(process.env.PLUGIN_STATICS_PATH, '');
  const pathArr = pathname.split('/');
  if (pathname.startsWith('@')) {
    return pathArr.slice(0, 2).join('/');
  }
  return pathArr[0];
}

export function getPackageDirByExposeUrl(pathname: string) {
  return getPackageDir(getPackageNameByExposeUrl(pathname));
}
