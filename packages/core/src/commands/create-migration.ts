import fs from 'node:fs';
import { dirname, resolve } from 'node:path';
import TachybaseGlobal from '@tachybase/globals';

import dayjs from 'dayjs';

import Application from '../application';

async function findRealPathFromPaths(paths: string[], subPath: string): Promise<string> {
  for (const base of paths) {
    const fullPath = resolve(base, subPath);
    try {
      return await fs.promises.realpath(fullPath);
    } catch {}
  }
  throw new Error(`Cannot resolve real path for ${subPath}`);
}

export default (app: Application) => {
  app
    .command('create-migration')
    .argument('<name>')
    .option('--pkg <pkg>')
    .option('--on [on]')
    .action(async (name, options) => {
      const pkg = options.pkg;
      const pluginPaths = TachybaseGlobal.getInstance().get<string[]>('PLUGIN_PATHS');
      const dir = await findRealPathFromPaths(pluginPaths, pkg);
      const filename = resolve(
        dir,
        pkg === '@tego/core' ? 'src' : 'src/server',
        'migrations',
        `${dayjs().format('YYYYMMDDHHmmss')}-${name}.ts`,
      );
      const version = app.getVersion();
      const keys: any[] = version.split('.');
      keys.push(1 * keys.pop() + 1);
      const nextVersion = keys.join('.');
      const from = pkg === '@tego/core' ? `../migration` : '@tego/core';
      const data = `import { Migration } from '${from}';

export default class extends Migration {
  on = '${options.on || 'afterLoad'}'; // 'beforeLoad' or 'afterLoad'
  appVersion = '<${nextVersion}';

  async up() {
    // coding
  }
}
`;
      await fs.promises.mkdir(dirname(filename), { recursive: true });
      await fs.promises.writeFile(filename, data, 'utf8');
      app.logger.info(`migration file in ${filename}`);
    });
};
