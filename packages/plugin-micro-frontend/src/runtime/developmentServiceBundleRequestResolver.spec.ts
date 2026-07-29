import { describe, expect, it } from 'vitest';
import { createDevelopmentServiceBundleRequestResolver } from './developmentServiceBundleRequestResolver';

describe('createDevelopmentServiceBundleRequestResolver', () => {
  it('assigns sequential ports to new services and reuses each in-memory mapping', () => {
    // Given
    const resolveRequest = createDevelopmentServiceBundleRequestResolver({
      platform: 'android',
    });

    // When
    const firstCar = resolveRequest({
      request: 'car',
      serviceKey: 'car',
    });
    const shopping = resolveRequest({
      request: 'shopping',
      serviceKey: 'shopping',
    });
    const secondCar = resolveRequest({
      request: 'car',
      serviceKey: 'car',
    });
    const insurance = resolveRequest({
      request: 'insurance',
      serviceKey: 'insurance',
    });

    // Then
    expect(firstCar).toBe('http://localhost:8082/index.bundle?platform=android&dev=true&minify=false');
    expect(shopping).toBe('http://localhost:8083/index.bundle?platform=android&dev=true&minify=false');
    expect(secondCar).toBe(firstCar);
    expect(insurance).toBe('http://localhost:8084/index.bundle?platform=android&dev=true&minify=false');
  });

  it('supports a caller-defined host and first service port', () => {
    // Given
    const resolveRequest = createDevelopmentServiceBundleRequestResolver({
      firstServicePort: 9000,
      hostname: '127.0.0.1',
      platform: 'ios',
    });

    // When
    const request = resolveRequest({
      request: 'catalog',
      serviceKey: 'catalog',
    });

    // Then
    expect(request).toBe('http://127.0.0.1:9000/index.bundle?platform=ios&dev=true&minify=false');
  });
});
