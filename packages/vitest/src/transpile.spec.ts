import { describe, expect, it } from 'vitest';
import { transformReactNativeSource } from './transpile';

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
});
