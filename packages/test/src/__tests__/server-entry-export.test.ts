import { setupServerTestEnvironment } from '@tachybase/test/server';

import { describe, expect, it } from 'vitest';

describe('@tachybase/test/server export', () => {
  it('exports setupServerTestEnvironment from the server entry', () => {
    expect(setupServerTestEnvironment).toEqual(expect.any(Function));
  });
});
