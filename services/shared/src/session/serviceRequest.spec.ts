import { describe, expect, it } from 'vitest';
import { getServiceKey } from './serviceRequest';

describe('getServiceKey', () => {
  it.each([
    ['service://catalog', 'catalog'],
    ['service://gateway/catalog', 'gateway'],
    ['granite://bare', 'bare'],
    ['http://localhost:8082/index.bundle?platform=android', 'localhost:8082'],
    ['http://localhost:8083/index.bundle?platform=android', 'localhost:8083'],
  ])('derives the service key from %s', (bundleRequest, expected) => {
    // Given / When
    const serviceKey = getServiceKey(bundleRequest);

    // Then
    expect(serviceKey).toBe(expected);
  });
});
