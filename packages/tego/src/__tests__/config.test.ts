import { describe, expect, it } from 'vitest';

import { getBodyParserOptions } from '../config';

describe('getBodyParserOptions', () => {
  it('uses APP_REQUEST_BODY_LIMIT for all parsed body types', () => {
    const result = getBodyParserOptions({
      APP_REQUEST_BODY_LIMIT: ' 50mb ',
    });

    expect(result).toEqual({
      jsonLimit: '50mb',
      formLimit: '50mb',
      textLimit: '50mb',
    });
  });

  it('uses the core default when APP_REQUEST_BODY_LIMIT is not set', () => {
    expect(getBodyParserOptions({})).toEqual({
      jsonLimit: '10mb',
      formLimit: '10mb',
      textLimit: '10mb',
    });
  });

  it('rejects APP_REQUEST_BODY_LIMIT without a unit', () => {
    expect(() =>
      getBodyParserOptions({
        APP_REQUEST_BODY_LIMIT: '10485760',
      }),
    ).toThrow('Invalid APP_REQUEST_BODY_LIMIT "10485760"');
  });

  it('rejects invalid APP_REQUEST_BODY_LIMIT values', () => {
    expect(() =>
      getBodyParserOptions({
        APP_REQUEST_BODY_LIMIT: 'ten mb',
      }),
    ).toThrow('Expected a positive integer followed by b, kb, mb, gb, or tb.');
  });
});
