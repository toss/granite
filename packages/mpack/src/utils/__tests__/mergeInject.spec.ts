import { describe, expect, it } from 'vitest';
import { mergeInject } from '../mergeInject';

describe('mergeInject', () => {
  it('mergeInject', () => {
    expect(mergeInject(['foo'], ['bar'])).toEqual(['foo', 'bar']);
    expect(mergeInject(['foo'], [])).toEqual(['foo']);
    expect(mergeInject([], ['foo'])).toEqual(['foo']);
  });
});
