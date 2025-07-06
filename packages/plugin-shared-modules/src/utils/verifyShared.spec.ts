import { describe, it, expect } from 'vitest';
import { verifyShared } from './verifyShared';

describe('verifyShared', () => {
  it('should throw an error if a non-singleton shared module is provided', () => {
    // @ts-expect-error - test
    expect(() => verifyShared({ lib: { singleton: false } })).toThrow();
  });
});
