import { describe, expect, it } from 'vitest';
import { getServiceKey } from './serviceRequest';

describe('getServiceKey', () => {
  it.each([
    ['service://catalog', 'catalog'],
    ['service://gateway/catalog', 'gateway'],
    ['granite://bare', 'bare'],
  ])('derives the service key from %s', (bundleRequest, expected) => {
    // Given / When
    const serviceKey = getServiceKey(bundleRequest);

    // Then
    expect(serviceKey).toBe(expected);
  });
});
