import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { expect, it } from 'vitest';

it('loads the CommonJS entry in Node without requiring browser-only assets', () => {
  const root = path.resolve(__dirname, '../../../..');

  const output = execFileSync(
    process.execPath,
    [
      '-e',
      [
        "const client = require('./packages/client/lib/index.js');",
        'console.log([client.APIClient, client.Input, client.FormItem, client.Lightbox].every(Boolean));',
      ].join(''),
    ],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 60000,
    },
  );

  expect(output.trim()).toBe('true');
}, 65000);
