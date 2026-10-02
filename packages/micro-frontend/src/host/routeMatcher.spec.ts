import { describe, expect, it } from 'vitest';
import { normalizeRoutePath } from './routeMatcher';

describe('normalizeRoutePath', () => {
  it.each([
    ['product//123/?tab=review#details', '/product/123'],
    ['/product/123///', '/product/123'],
    ['', '/'],
  ])('normalizes %s to %s', (routePath, expected) => {
    expect(normalizeRoutePath(routePath)).toBe(expected);
  });
});
