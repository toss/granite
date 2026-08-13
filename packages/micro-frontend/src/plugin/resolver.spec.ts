import { describe, expect, it } from 'vitest';
import { createSharedResolverConfig } from './resolver';

describe('createSharedResolverConfig', () => {
  it('creates a lazy shared-module forwarding loader', () => {
    const config = createSharedResolverConfig([['react-native-pager-view', {}]]);
    const loader = config.protocols?.['granite-micro-frontend-shared']?.load;

    expect(
      loader?.({
        path: 'react-native-pager-view',
        namespace: 'granite-micro-frontend-shared',
        suffix: '',
        pluginData: undefined,
        with: {},
      })
    ).toMatchObject({
      loader: 'js',
      contents: expect.stringContaining('Object.defineProperty(moduleExports, key, {'),
    });
  });
});
