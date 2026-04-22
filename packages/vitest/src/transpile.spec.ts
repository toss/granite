import { describe, expect, it } from 'vitest';
import { shouldTransformReactNativeFile, transformReactNativeSource } from './transpile';

describe('transformReactNativeSource', () => {
  it('strips Flow types and leaves JSX for the bundler pipeline', async () => {
    const transformed = await transformReactNativeSource(
      '/virtual/react-native/Libraries/Button.js',
      'export function Button(props: { label: string }) { return <View foo={props.label} />; }',
    );

    expect(transformed).toContain('export function Button(props)');
    expect(transformed).toContain('<View foo={props.label} />');
    expect(transformed).toContain('Button');
    expect(transformed).not.toContain(': { label: string }');
  });

  it('treats mirrored RN-family package roots as transformable source', () => {
    const communityPackageRoot = '/virtual/node_modules/@react-native-community/blur';
    const jestReactNativeRoot = '/virtual/node_modules/jest-react-native';

    expect(
      shouldTransformReactNativeFile(
        `${communityPackageRoot}/src/index.js`,
        [communityPackageRoot],
      ),
    ).toBe(true);
    expect(
      shouldTransformReactNativeFile(
        `${jestReactNativeRoot}/index.js`,
        [jestReactNativeRoot],
      ),
    ).toBe(true);
  });
});
