import path from 'node:path';

import Topo from '@hapi/topo';
import { findWorkspacePackages, type Project } from '@pnpm/workspace.find-packages';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { ROOT_PATH } from './build/constant';
import { toUnixPath } from './build/utils';
import { IProject } from './interfaces';

/**
 * 获取构建包的绝对路径，支持项目路径和 npm 两种形式
 * @example
 * pnpm build packages/client @tachybase/acl => ['/home/xx/packages/client', '/home/xx/packages/acl']
 * pnpm build packages/plugin-auth-* => ['/home/xx/packages/plugin-auth-a', '/home/xx/packages/plugin-auth-b']
 * pnpm build => all packages
 */
function getPackagesPath(pkgs: string[]) {
  const allPackageJson = fg.sync(['apps/*/package.json', 'packages/*/package.json'], {
    cwd: ROOT_PATH,
    absolute: true,
    onlyFiles: true,
  });

  if (pkgs.length === 0) {
    return allPackageJson.map(toUnixPath).map((item) => path.dirname(item));
  }
  const allPackageInfo = allPackageJson
    .map((packageJsonPath) => ({
      name: fs.readJsonSync(packageJsonPath).name as string,
      path: path.dirname(toUnixPath(packageJsonPath)) as string,
    }))
    .reduce(
      (acc, cur) => {
        acc[cur.name] = cur.path;
        return acc;
      },
      {} as Record<string, string>,
    );
  const allPackagePaths: string[] = Object.values(allPackageInfo);

  const pkgNames = pkgs.filter((item) => allPackageInfo[item]);
  const relativePaths = pkgNames.length ? pkgs.filter((item) => !pkgNames.includes(item)) : pkgs;
  const pkgPaths = pkgs.map((item) => allPackageInfo[item]);
  const absPaths = allPackagePaths.filter((absPath) =>
    relativePaths.some((relativePath) => absPath.endsWith(relativePath)),
  );
  const dirPaths = fg.sync(pkgs, { onlyDirectories: true, absolute: true, cwd: ROOT_PATH });
  const dirMatchPaths = allPackagePaths.filter((pkgPath) => dirPaths.some((dirPath) => pkgPath.startsWith(dirPath)));
  return [...new Set([...pkgPaths, ...absPaths, ...dirMatchPaths])];
}

export async function getPackages(pkgs: string[]) {
  const packagePaths = getPackagesPath(pkgs);

  const allProjects = await findWorkspacePackages(ROOT_PATH, {
    supportedArchitectures: {
      os: ['current'],
      cpu: ['current'],
      libc: ['current'],
    },
  });

  const packages = allProjects.filter((pkg) => packagePaths.includes(toUnixPath(pkg.dir)));

  return sortPackages(packages);
}

// make sure the order of packages is correct
export function sortPackages(packages: Project[]): IProject[] {
  const sorter = new Topo.Sorter<IProject>();
  for (const pkg of packages) {
    const pkgJson = fs.readJsonSync(`${pkg.dir}/package.json`);
    const after = Object.keys({ ...pkgJson.dependencies, ...pkgJson.devDependencies, ...pkgJson.peerDependencies });
    // FIXME 理应在最初的时候转成 IProject，而不是排序的时候
    sorter.add(pkg as IProject, { after, group: pkg.manifest.name });
  }
  return sorter.nodes;
}
