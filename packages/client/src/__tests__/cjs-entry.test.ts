import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { expect, it } from 'vitest';

it('loads the client entry through CommonJS in Node without requiring browser-only assets', () => {
  const root = path.resolve(__dirname, '../../../..');

  const output = execFileSync(
    process.execPath,
    [
      '-e',
      [
        "require('tsx/cjs');",
        "const client = require('./packages/client/src/index.ts');",
        'const inputTextArea = client.Input.TextArea;',
        'console.log([client.APIClient, client.Input, inputTextArea, client.FormItem, client.Lightbox].every(Boolean));',
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
