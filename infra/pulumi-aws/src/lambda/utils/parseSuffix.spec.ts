import { InvalidRequest } from '@granite-js/deployment-manager';
import { describe, expect, it } from 'vitest';
import { parseSuffix } from './parseSuffix';

describe('parseSuffix', () => {
  it('parses suffix correctly from various URIs', () => {
    expect(parseSuffix('/ios/granite/0/0_72_6')).toBe('0_72_6');
    expect(parseSuffix('/android/granite/0/0_72_6')).toBe('0_72_6');

    expect(parseSuffix('/ios/granite/0/0_72_6-reav3')).toBe('0_72_6-reav3');
    expect(parseSuffix('/android/granite/0/0_72_6-reav3')).toBe('0_72_6-reav3');
  });

  it('throws error when token is not the 4th one', () => {
    expect(() => parseSuffix('/ios/granite/0')).toThrowError(InvalidRequest);
    expect(() => parseSuffix('/ios/granite/0/')).toThrowError(InvalidRequest);
    expect(() => parseSuffix('/ios/0_72_6.gz')).toThrowError(InvalidRequest);
    expect(() => parseSuffix('/granite/0_72_6.gz')).toThrowError(InvalidRequest);
  });
});
