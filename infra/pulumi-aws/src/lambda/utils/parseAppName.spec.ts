import { describe, expect, it } from 'vitest';
import { parseAppName } from './parseAppName';

describe('parseAppName', () => {
  it('parses /ios/foo to foo', () => {
    expect(parseAppName('/ios/foo')).toBe('foo');
  });

  it('parses /android/foo to foo', () => {
    expect(parseAppName('/android/foo')).toBe('foo');
  });

  it('parses /ios/my-point/1 to my-point', () => {
    expect(parseAppName('/ios/my-point/1')).toBe('my-point');
  });

  it('parses /ios/my-point/1/hbc to my-point', () => {
    expect(parseAppName('/ios/my-point/1/hbc')).toBe('my-point');
  });
});
