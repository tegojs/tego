import { setupServerTestEnvironment } from '@tachybase/test/setup-server';

import { describe, expect, it } from 'vitest';

describe('@tachybase/test/setup-server export', () => {
  it('exports setupServerTestEnvironment from the setup server entry', () => {
    expect(setupServerTestEnvironment).toEqual(expect.any(Function));
  });
});
