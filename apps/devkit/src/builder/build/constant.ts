import path from 'node:path';

import type { Project } from '@pnpm/workspace.find-packages';

export const globExcludeFiles = [
  '!src/**/__tests__',
  '!src/**/__test__',
  '!src/**/__e2e__',
  '!src/**/demos',
  '!src/**/fixtures',
  '!src/**/*.mdx',
  '!src/**/*.md',
  '!src/**/*.+(test|e2e|spec).+(js|jsx|ts|tsx)',
];
export const EsbuildSupportExts = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.css',
  '.less',
  '.sass',
  '.scss',
  '.styl',
  '.txt',
  '.data',
];

export const PATTERN_PLUGIN = '@[^/]+/plugin-';
export const PATTERN_MODULE = '@[^/]+/module-';
export const PLUGIN_PATTRN = /^(@[^/]+\/)?(module|plugin)-/;
export const ROOT_PATH = process.cwd();
export const NODE_MODULES = path.join(ROOT_PATH, 'node_modules');
export const PACKAGES_PATH = path.join(ROOT_PATH, 'packages');
export const getPluginPackages = (packages: Project[]) =>
  packages.filter((item) => !!item.manifest.name?.match(PATTERN_PLUGIN) || !!item.manifest.name?.match(PATTERN_MODULE));
export const CORE_APP = path.join(ROOT_PATH, 'apps/web');
export const CORE_CLIENT = path.join(PACKAGES_PATH, 'client');
export const ESM_PACKAGES = ['@tachybase/test'];
export const CJS_EXCLUDE_PACKAGES = [path.join(ROOT_PATH, 'apps/devkit'), CORE_CLIENT, CORE_APP];
export const getCjsPackages = (packages: Project[]) =>
  packages
    .filter((item) => !item.manifest.name?.match(PATTERN_PLUGIN))
    .filter((item) => !item.manifest.name?.match(PATTERN_MODULE))
    .filter((item) => !CJS_EXCLUDE_PACKAGES.includes(item.dir));

// tar
export const tarIncludesFiles = ['package.json', 'README.md', 'LICENSE', 'dist', '!node_modules', '!src'];
export const TAR_OUTPUT_DIR = process.env.TAR_PATH ? process.env.TAR_PATH : path.join(ROOT_PATH, 'storage', 'tar');
