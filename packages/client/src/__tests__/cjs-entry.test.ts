import { createRequire } from 'node:module';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('@tego/client CJS entry', () => {
  it('can be required in Node without loading browser-only assets', () => {
    const require = createRequire(import.meta.url);
    const client = require(path.resolve(__dirname, '../../lib/index.js'));

    expect(client.APIClient).toBeDefined();
    expect(client.Input).toBeDefined();
  });
});
