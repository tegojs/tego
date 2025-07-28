import { existsSync as _existsSync, existsSync, mkdirSync, readFileSync, rmSync, watch, writeFileSync } from 'node:fs';
import { dirname as _dirname, sep as _sep, join, relative, resolve, sep } from 'node:path';

import { sync } from 'fast-glob';

import { version } from '../package.json';

const ProjectRoot = process.cwd();

export function getUmiConfig() {
  const { APP_PORT, API_BASE_URL, APP_PUBLIC_PATH } = process.env;
  const API_BASE_PATH = process.env.API_BASE_PATH || '/api/';
  const EXTENSION_UI_BASE_PATH = process.env.EXTENSION_UI_BASE_PATH || '/adapters/';
  const PROXY_TARGET_URL = process.env.PROXY_TARGET_URL || `http://127.0.0.1:${APP_PORT}`;
  const LOCAL_STORAGE_BASE_URL = 'storage/uploads/';
  const STATIC_PATH = 'static/';

  function getLocalStorageProxy() {
    if (LOCAL_STORAGE_BASE_URL.startsWith('http')) {
      return {};
    }

    return {
      [APP_PUBLIC_PATH + LOCAL_STORAGE_BASE_URL]: {
        target: PROXY_TARGET_URL,
        changeOrigin: true,
      },
      [APP_PUBLIC_PATH + STATIC_PATH]: {
        target: PROXY_TARGET_URL,
        changeOrigin: true,
      },
    };
  }

  return {
    alias: getPackagePaths().reduce((memo, item) => {
      memo[item[0]] = item[1];
      return memo;
    }, {}),
    define: {
      'process.env.APP_PUBLIC_PATH': process.env.APP_PUBLIC_PATH,
      'process.env.WS_PATH': process.env.WS_PATH,
      'process.env.API_BASE_URL': API_BASE_URL || API_BASE_PATH,
      'process.env.APP_ENV': process.env.APP_ENV,
      'process.env.VERSION': version,
      'process.env.WEBSOCKET_URL': process.env.WEBSOCKET_URL,
      'process.env.__E2E__': process.env.__E2E__,
    },
    // only proxy when using `umi dev`
    // if the assets are built, will not proxy
    proxy: {
      [API_BASE_PATH]: {
        target: PROXY_TARGET_URL,
        changeOrigin: true,
        pathRewrite: { [`^${API_BASE_PATH}`]: API_BASE_PATH },
      },
      [EXTENSION_UI_BASE_PATH]: {
        target: PROXY_TARGET_URL,
        changeOrigin: true,
        pathRewrite: { [`^${EXTENSION_UI_BASE_PATH}`]: EXTENSION_UI_BASE_PATH },
      },
      // for local storage
      ...getLocalStorageProxy(),
    },
  };
}

function getTsconfigPaths() {
  const content = readFileSync(resolve(ProjectRoot, 'tsconfig.paths.json'), 'utf-8');
  const json = JSON.parse(content);
  return json.compilerOptions.paths;
}

function getPackagePaths() {
  const paths = getTsconfigPaths();
  const pkgs = [];
  for (const key in paths) {
    if (Object.hasOwnProperty.call(paths, key)) {
      for (let dir of paths[key]) {
        if (dir.includes('*')) {
          const files = sync(dir, { cwd: ProjectRoot, onlyDirectories: true });
          for (const file of files) {
            const dirname = resolve(ProjectRoot, file);
            if (existsSync(dirname)) {
              const re = new RegExp(dir.replace('*', '(.+)'));
              const p = dirname
                .substring(ProjectRoot.length + 1)
                .split(sep)
                .join('/');
              const match = re.exec(p);
              pkgs.push([key.replace('*', match?.[1]), dirname]);
            }
          }
        } else {
          const dirname = resolve(ProjectRoot, dir);
          pkgs.push([key, dirname]);
        }
      }
    }
  }
  return pkgs;
}

export function resolveTachybasePackagesAlias(config) {
  const pkgs = getPackagePaths();
  for (const [pkg, dir] of pkgs) {
    config.module.rules.get('ts-in-node_modules').include.add(dir);
    config.resolve.alias.set(pkg, dir);
  }
}

function getNodeModulesPath(packageDir) {
  const node_modules_dir = join(ProjectRoot, 'node_modules');
  return join(node_modules_dir, packageDir);
}
export class IndexGenerator {
  tachybaseDir = getNodeModulesPath('@tachybase');

  constructor(outputPath, pluginsPath) {
    this.outputPath = outputPath;
    this.pluginsPath = pluginsPath;
  }

  get indexPath() {
    return join(this.outputPath, 'index.ts');
  }

  get packageMapPath() {
    return join(this.outputPath, 'packageMap.json');
  }

  get packagesPath() {
    return join(this.outputPath, 'packages');
  }

  generate() {
    this.generatePluginContent();
    if (process.env.NODE_ENV === 'production') return;
    this.pluginsPath.forEach((pluginPath) => {
      if (!_existsSync(pluginPath)) {
        return;
      }
      watch(pluginPath, { recursive: false }, () => {
        this.generatePluginContent();
      });
    });
  }

  get indexContent() {
    return `// @ts-nocheck
import packageMap from './packageMap.json';

function devDynamicImport(packageName: string): Promise<any> {
  const fileName = packageMap[packageName];
  if (!fileName) {
    return Promise.resolve(null);
  }
  return import(\`./packages/\${fileName}\`)
}
export default devDynamicImport;`;
  }

  get emptyIndexContent() {
    return `
export default function devDynamicImport(packageName: string): Promise<any> {
  return Promise.resolve(null);
}`;
  }

  generatePluginContent() {
    if (_existsSync(this.outputPath)) {
      rmSync(this.outputPath, { recursive: true, force: true });
    }
    mkdirSync(this.outputPath);
    const validPluginPaths = this.pluginsPath.filter((pluginsPath) => {
      return _existsSync(pluginsPath);
    });
    if (process.env.NODE_ENV === 'production') {
      writeFileSync(this.indexPath, this.emptyIndexContent);
      return;
    }

    const pluginInfos = validPluginPaths.map((pluginsPath) => this.getContent(pluginsPath)).flat();

    // index.ts
    writeFileSync(this.indexPath, this.indexContent);
    // packageMap.json
    const packageMapContent = pluginInfos.reduce((memo, item) => {
      memo[item.packageJsonName] = item.pluginFileName + '.ts';
      return memo;
    }, {});
    writeFileSync(this.packageMapPath, JSON.stringify(packageMapContent, null, 2));
    // packages
    mkdirSync(this.packagesPath, { recursive: true });
    pluginInfos.forEach((item) => {
      const pluginPackagePath = join(this.packagesPath, item.pluginFileName + '.ts');
      writeFileSync(pluginPackagePath, item.exportStatement);
    });
  }

  getContent(pluginsPath) {
    const pluginFolders = sync(['plugin-*/package.json', 'module-*/package.json'], {
      cwd: pluginsPath,
      onlyFiles: true,
      absolute: true,
    });

    const pluginInfos = Array.from(new Set(pluginFolders))
      .filter((item) => {
        const dirname = _dirname(item);
        const clientJs = join(dirname, 'client.js');
        return _existsSync(clientJs);
      })
      .map((pluginPackageJsonPath) => {
        const pluginPackageJson = require(pluginPackageJsonPath);
        const pluginPathArr = pluginPackageJsonPath.replaceAll(_sep, '/').split('/');
        const hasNamespace = pluginPathArr[pluginPathArr.length - 3].startsWith('@');
        const pluginFileName = (
          hasNamespace
            ? `${pluginPathArr[pluginPathArr.length - 3].replace('@', '')}_${pluginPathArr[pluginPathArr.length - 2]}`
            : pluginPathArr[pluginPathArr.length - 2]
        ).replaceAll('-', '_');

        let exportStatement = '';
        if (pluginPackageJsonPath.includes('packages')) {
          const pluginSrcClientPath = relative(
            this.packagesPath,
            join(_dirname(pluginPackageJsonPath), 'src', 'client'),
          ).replaceAll(_sep, '/');
          exportStatement = `export { default } from '${pluginSrcClientPath}';`;
          exportStatement += '\n';
          exportStatement += `export * from '${pluginSrcClientPath}';`;
        } else {
          exportStatement = `export { default } from '${pluginPackageJson.name}/client';`;
          exportStatement += '\n';
          exportStatement += `export * from '${pluginPackageJson.name}/client';`;
        }
        return { exportStatement, pluginFileName, packageJsonName: pluginPackageJson.name };
      });

    return pluginInfos;
  }
}
