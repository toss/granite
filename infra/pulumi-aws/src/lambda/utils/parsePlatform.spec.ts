import { describe, expect, it } from 'vitest';
import { parsePlatform } from './parsePlatform';

describe('parsePlatform', () => {
  it('parses /ios to ios', () => {
    expect(parsePlatform('/ios')).toBe('ios');
  });

  it('parses /android to android', () => {
    expect(parsePlatform('/android')).toBe('android');
  });

  it('parses /ios/foo to ios', () => {
    expect(parsePlatform('/ios/foo')).toBe('ios');
  });

  it('parses /android/foo to android', () => {
    expect(parsePlatform('/android/foo')).toBe('android');
  });

  it('throws error when url does not match pattern', () => {
    expect(() => parsePlatform('/hello/world')).toThrow('URI must start with /ios or /android');
  });
});
