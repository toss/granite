import type { ServiceComponent } from '@granite-js/react-native';
import { lazy } from 'react';
import { describe, expect, it } from 'vitest';
import {
  closeServiceSession,
  createServiceSessionInitialProps,
  openServiceSession,
  updateServiceSessionVisibility,
} from './serviceSession';

describe('serviceSession', () => {
  it('opens, updates visibility, and closes a session by identifier', () => {
    const CatalogService: ServiceComponent = () => null;
    const ServiceComponent = lazy(async () => ({ default: CatalogService }));
    const opened = openServiceSession(
      [],
      {
        identifier: 'session-1',
        serviceName: 'catalog',
        url: 'granite://catalog/products/42',
      },
      ServiceComponent
    );
    const visible = updateServiceSessionVisibility(opened, {
      identifier: 'session-1',
      isVisible: true,
    });
    const closed = closeServiceSession(visible, {
      identifier: 'session-1',
    });

    expect(opened).toEqual([
      {
        identifier: 'session-1',
        serviceName: 'catalog',
        url: 'granite://catalog/products/42',
        isVisible: false,
        ServiceComponent,
      },
    ]);
    expect(visible[0]?.isVisible).toBe(true);
    expect(closed).toEqual([]);
  });

  it('uses the complete service URL as the mounted app initial scheme', () => {
    // Given
    const initialProps = {
      platform: 'android',
      initialColorPreference: 'light',
      scheme: 'granite://shared',
    } as const;

    // When
    const serviceInitialProps = createServiceSessionInitialProps(initialProps, 'granite://catalog/search');

    // Then
    expect(serviceInitialProps).toEqual({
      platform: 'android',
      initialColorPreference: 'light',
      scheme: 'granite://catalog/search',
    });
  });
});
