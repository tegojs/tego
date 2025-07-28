import { mkdir } from 'node:fs/promises';
import path, { dirname } from 'node:path';

import Arborist from '@npmcli/arborist';
import fs from 'fs-extra';
import packlist from 'npm-packlist';
import * as tar from 'tar';

import { TAR_OUTPUT_DIR } from './constant';
import { PkgLog } from './utils';

export async function tarPlugin(cwd: string, log: PkgLog) {
  log('tar package', cwd);
  const arborist = new Arborist({ path: cwd });
  const node = await arborist.loadActual();
  const files = await packlist(node);
  const pkg = fs.readJsonSync(path.join(cwd, 'package.json'));
  const tarball = path.join(TAR_OUTPUT_DIR, `${pkg.name}-${pkg.version}.tgz`);
  await mkdir(dirname(tarball), { recursive: true });
  await tar.c(
    {
      gzip: true,
      file: tarball,
      cwd,
    },
    files,
  );
}
