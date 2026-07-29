import { describe, expect, it } from 'vitest';
import { getServiceKey } from './serviceRequest';

describe('getServiceKey', () => {
  it.each([
    ['catalog', 'catalog'],
    ['SHOPPING', 'shopping'],
    [' bare ', 'bare'],
  ])('normalizes the service key from %s', (serviceName, expected) => {
    // Given / When
    const serviceKey = getServiceKey(serviceName);

    // Then
    expect(serviceKey).toBe(expected);
  });
});
