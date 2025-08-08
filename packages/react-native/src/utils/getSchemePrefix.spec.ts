import { describe, expect, it } from 'vitest';
import { getSchemePrefix } from './getSchemePrefix';

describe('getSchemePrefix', () => {
  it('should return correct URL when host is empty', () => {
    const result = getSchemePrefix({
      scheme: 'myapp',
      appName: 'testapp',
      host: '',
    });

    expect(result).toBe('myapp://testapp');
  });

  it('should return correct URL when host is provided', () => {
    const result = getSchemePrefix({
      scheme: 'myapp',
      appName: 'testapp',
      host: 'super',
    });

    expect(result).toBe('myapp://super/testapp');
  });

  it('should handle different schemes', () => {
    const result = getSchemePrefix({
      scheme: 'https',
      appName: 'webapp',
      host: 'myhost',
    });

    expect(result).toBe('https://myhost/webapp');
  });

  it('should handle different app names', () => {
    const result = getSchemePrefix({
      scheme: 'myapp',
      appName: 'production-app',
      host: 'myhost',
    });

    expect(result).toBe('myapp://myhost/production-app');
  });
});
