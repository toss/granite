import { describe, expect, it } from 'vitest';
import { createSharedResolverConfig } from './resolver';

describe('createSharedResolverConfig', () => {
  it('preserves the default export of a registered ESM namespace', () => {
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
      contents: expect.stringContaining(
        'module.exports = Object.assign({}, sharedModule.get(), { __esModule: true });'
      ),
    });
  });
});
