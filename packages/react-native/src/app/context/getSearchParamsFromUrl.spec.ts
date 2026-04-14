import { describe, expect, it } from 'vitest';
import { getSearchParamsFromUrl } from './getSearchParamsFromUrl';

describe('getSearchParamsFromUrl', () => {
  it('returns query parameters from a custom scheme URL', () => {
    expect(getSearchParamsFromUrl('myapp://home?userId=42&theme=dark')).toEqual({
      userId: '42',
      theme: 'dark',
    });
  });

  it('decodes query parameters the same way as URLSearchParams', () => {
    expect(getSearchParamsFromUrl('myapp://home?name=foo+bar&message=hello%20world')).toEqual({
      name: 'foo bar',
      message: 'hello world',
    });
  });

  it('ignores the hash fragment and keeps the last duplicated key', () => {
    expect(getSearchParamsFromUrl('myapp://home?a=1&a=2#section')).toEqual({
      a: '2',
    });
  });

  it('returns an empty object for URLs without a query string', () => {
    expect(getSearchParamsFromUrl('myapp://home')).toEqual({});
  });

  it('returns an empty object for invalid URLs', () => {
    expect(getSearchParamsFromUrl('not a url')).toEqual({});
  });
});
