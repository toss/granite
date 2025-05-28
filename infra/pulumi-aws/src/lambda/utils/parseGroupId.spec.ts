import { describe, expect, it } from 'vitest';
import { parseGroupId } from './parseGroupId';

describe('parseGroupId', () => {
  it('parses groupId correctly from various URIs', () => {
    expect(parseGroupId('/ios')).toBeUndefined();
    expect(parseGroupId('/android')).toBeUndefined();
    expect(parseGroupId('/ios/my-point')).toBeUndefined();
    expect(parseGroupId('/ios/my-point.hbc')).toBeUndefined();
    expect(parseGroupId('/android/my-point')).toBeUndefined();
    expect(parseGroupId('/ios/my-point/foo')).toBe('foo');
    expect(parseGroupId('/android/my-point/bar')).toBe('bar');
    expect(parseGroupId('/ios/my-point/foo/hbc')).toBe('foo');
    expect(parseGroupId('/android/my-point/bar/hbc')).toBe('bar');
    expect(parseGroupId('/android/my-point/e07617afd7a8dcae18340bf7e602cc135b7a5c0c/hbc')).toBe(
      'e07617afd7a8dcae18340bf7e602cc135b7a5c0c'
    );
  });
});
