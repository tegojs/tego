import { createRequire } from 'node:module';
import path from 'node:path';

import { findWorkspacePackages } from '@pnpm/workspace.find-packages';
import fs from 'fs-extra';
import { load } from 'js-yaml';

import { ROOT_PATH } from '../constant';

const require = createRequire(import.meta.url);

export function winPath(path: string) {
  const isExtendedLengthPath = path.startsWith('\\\\?\\');
  if (isExtendedLengthPath) {
    return path;
  }
  return path.replace(/\\/g, '/');
}

/**
 * get relative externals for specific pre-bundle pkg from other pre-bundle deps
 * @note  for example, "compiled/a" can be externalized in "compiled/b" as "../a"
 */
export function getRltExternalsFromDeps(
  depExternals: Record<string, string>,
  current: { name: string; outputDir: string },
) {
  return Object.entries(depExternals).reduce<Record<string, string>>((r, [dep, target]) => {
    // skip self
    if (dep !== current.name) {
      // transform dep externals path to relative path
      r[dep] = winPath(path.relative(current.outputDir, path.dirname(target)));
    }

    return r;
  }, {});
}

function findPackageJson(filePath: string) {
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
 */
export function getDepPkgPath(dep: string, cwd: string) {
  try {
    return require.resolve(`${dep}/package.json`, { paths: [cwd] });
  } catch {
    const mainFile = require.resolve(`${dep}`, { paths: cwd ? [cwd] : undefined });
    const packageDir = mainFile.slice(0, mainFile.indexOf(dep.replace('/', path.sep)) + dep.length);
    const result = path.join(packageDir, 'package.json');
    if (!fs.existsSync(result)) {
      return path.join(findPackageJson(mainFile), 'package.json');
    }
    return result;
  }
}

/**
 * Get workspace package path by name
 */
async function getWorkspacePackagePath(packageName: string): Promise<string | null> {
  try {
    const allProjects = await findWorkspacePackages(ROOT_PATH, {
      supportedArchitectures: {
        os: ['current'],
        cpu: ['current'],
        libc: ['current'],
      },
    });
    const pkg = allProjects.find((p) => p.manifest.name === packageName);
    return pkg ? path.join(pkg.dir, 'package.json') : null;
  } catch {
    return null;
  }
}

/**
 * Get catalog version from pnpm-workspace.yaml
 */
function getCatalogVersion(packageName: string, catalogRef: string): string | null {
  try {
    const workspaceYamlPath = path.join(ROOT_PATH, 'pnpm-workspace.yaml');
    if (!fs.existsSync(workspaceYamlPath)) {
      return null;
    }
    const workspaceContent = fs.readFileSync(workspaceYamlPath, 'utf-8');
    const workspaceConfig = load(workspaceContent) as { catalog?: Record<string, string> };
    if (!workspaceConfig.catalog) {
      return null;
    }
    // catalog: 协议格式为 catalog:packageName 或 catalog:packageName@version
    const catalogKey = catalogRef.replace('catalog:', '');
    return workspaceConfig.catalog[catalogKey] || null;
  } catch {
    return null;
  }
}

/**
 * Get dependency version based on protocol type
 * - workspace:*: Read from workspace package.json
 * - catalog:: Read from pnpm-workspace.yaml catalog
 * - normal: Read from node_modules
 */
export async function getDepVersion(packageName: string, cwd: string): Promise<string | null> {
  try {
    // Get current package.json to check dependency protocol
    const currentPkgPath = path.join(cwd, 'package.json');
    if (!fs.existsSync(currentPkgPath)) {
      // Fallback to node_modules if package.json not found
      const depPkgPath = getDepPkgPath(packageName, cwd);
      const depPkg = require(depPkgPath);
      return depPkg.version;
    }

    const currentPkg = fs.readJsonSync(currentPkgPath);
    const allDeps = {
      ...currentPkg.dependencies,
      ...currentPkg.devDependencies,
      ...currentPkg.peerDependencies,
    };

    const depVersion = allDeps[packageName];
    if (!depVersion) {
      // Not in dependencies, try to get from node_modules
      const depPkgPath = getDepPkgPath(packageName, cwd);
      const depPkg = require(depPkgPath);
      return depPkg.version;
    }

    // Check protocol type
    if (depVersion === 'workspace:*' || depVersion.startsWith('workspace:')) {
      // For workspace:* protocol, read from workspace package.json
      const workspacePkgPath = await getWorkspacePackagePath(packageName);
      if (workspacePkgPath && fs.existsSync(workspacePkgPath)) {
        const workspacePkg = fs.readJsonSync(workspacePkgPath);
        return workspacePkg.version;
      }
      // Fallback to node_modules if workspace package not found
      const depPkgPath = getDepPkgPath(packageName, cwd);
      const depPkg = require(depPkgPath);
      return depPkg.version;
    }

    if (depVersion.startsWith('catalog:')) {
      // For catalog: protocol, read from pnpm-workspace.yaml catalog
      const catalogVersion = getCatalogVersion(packageName, depVersion);
      if (catalogVersion) {
        return catalogVersion;
      }
      // Fallback to node_modules if catalog not found
      const depPkgPath = getDepPkgPath(packageName, cwd);
      const depPkg = require(depPkgPath);
      return depPkg.version;
    }

    // For normal dependencies, read from node_modules
    const depPkgPath = getDepPkgPath(packageName, cwd);
    const depPkg = require(depPkgPath);
    return depPkg.version;
  } catch (error) {
    console.error(`Error getting version for ${packageName}:`, error);
    return null;
  }
}

interface IDepPkg {
  nccConfig: {
    minify: boolean;
    target: string;
    quiet: boolean;
    externals: Record<string, string>;
  };
  depDir: string;
  pkg: Record<string, any>;
  outputDir: string;
  mainFile: string;
}

export function getDepsConfig(cwd: string, outDir: string, depsName: string[], external: string[]) {
  const pkgExternals: Record<string, string> = external.reduce((r, dep) => ({ ...r, [dep]: dep }), {});

  const depExternals = {};
  const deps = depsName.reduce<Record<string, IDepPkg>>((acc, packageName) => {
    const depEntryPath = require.resolve(packageName, { paths: [cwd] });
    const depPkgPath = getDepPkgPath(packageName, cwd);
    const depPkg = require(depPkgPath);
    const depDir = path.dirname(depPkgPath);
    const outputDir = path.join(outDir, packageName);
    const mainFile = path.join(outputDir, depEntryPath.replace(depDir, ''));
    acc[depEntryPath] = {
      nccConfig: {
        minify: true,
        target: 'es5',
        quiet: true,
        externals: {},
      },
      depDir,
      pkg: depPkg,
      outputDir,
      mainFile,
    };

    return acc;
  }, {});

  // process externals for deps
  Object.values(deps).forEach((depConfig) => {
    const rltDepExternals = getRltExternalsFromDeps(depExternals, {
      name: depConfig.pkg.name!,
      outputDir: depConfig.outputDir,
    });

    depConfig.nccConfig.externals = {
      ...pkgExternals,
      ...rltDepExternals,
    };
  });

  return deps;
}
