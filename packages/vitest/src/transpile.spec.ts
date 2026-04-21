import { describe, expect, it } from 'vitest';
import { transformReactNativeSource } from './transpile';

describe('transformReactNativeSource', () => {
  it('transforms React Native .js files that contain JSX', () => {
    const transformed = transformReactNativeSource(
      '/virtual/react-native/Libraries/Button.js',
      'export function Button() { return <View />; }',
    );

    expect(transformed).toContain('React.createElement');
    expect(transformed).toContain('Button');
  });
});
