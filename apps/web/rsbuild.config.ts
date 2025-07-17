import path from 'node:path';

import { defineConfig } from '@rsbuild/core';
import { pluginLess } from '@rsbuild/plugin-less';
import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill';
import { pluginReact } from '@rsbuild/plugin-react';
import { getUmiConfig, IndexGenerator } from '@tego/devkit';

const config = getUmiConfig();

const pluginDirs = ['packages'].map((item) => path.join(process.cwd(), item));

const outputPluginPath = path.join(__dirname, 'src/.plugins');
const indexGenerator = new IndexGenerator(outputPluginPath, pluginDirs);
indexGenerator.generate();

const rsDefined = {};
for (const key in config.define) {
  rsDefined[key] = JSON.stringify(config.define[key]);
}

export default defineConfig({
  html: {
    title: 'Tachybase',
    inject: 'body',
    template: 'src/assets/index.html',
    meta: [{ viewport: 'initial-scale=0.1' }],
    favicon: 'src/assets/favicon.ico',
    appIcon: {
      name: 'Tachybase',
      icons: [
        {
          src: 'src/assets/apple-touch-icon.png',
          size: 180,
          target: 'apple-touch-icon',
        },
        {
          src: 'src/assets/android-chrome-192x192.png',
          size: 192,
          target: 'web-app-manifest',
        },
        {
          src: 'src/assets/android-chrome-512x512.png',
          size: 512,
          target: 'web-app-manifest',
        },
      ],
    },
  },
  source: {
    define: {
      ...rsDefined,
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'process.env.REACT_APP_CLICK_TO_COMPONENT_EDITOR': JSON.stringify(
        process.env.REACT_APP_CLICK_TO_COMPONENT_EDITOR,
      ),
    },
  },
  dev: {
    hmr: false,
    writeToDisk: false,
  },
  output: {
    distPath: {
      js: 'assets',
      css: 'assets',
      image: 'assets',
      svg: 'assets',
      font: 'assets',
      media: 'assets',
    },
    minify: true,
    overrideBrowserslist: ['chrome >= 69', 'edge >= 79', 'safari >= 12'],
  },
  server: {
    port: Number(process.env.PORT || 3000),
    open: !process.env.NO_OPEN,
    proxy: {
      ...config.proxy,
    },
  },
  plugins: [pluginReact(), pluginLess(), pluginNodePolyfill()],
  resolve: {
    alias: {
      ...config.alias,
      // TODO：暂时只对这个库做处理
      i18next: require.resolve('i18next'),
      'react-i18next': require.resolve('react-i18next'),
    },
  },
});
