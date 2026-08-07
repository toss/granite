import { describe, expect, it } from 'vitest';
import { getPreludeConfig } from './prelude';

describe('getPreludeConfig', () => {
  it('registers the Granite app container and exposed modules through the package runtime', () => {
    // Given
    const options = {
      exposes: {
        './App': './src/_app.tsx',
      },
      shared: {
        react: { eager: true },
        'react-native': { eager: true },
      },
    } as const;

    // When
    const config = getPreludeConfig(options);

    // Then
    expect(config.preludeScript).toContain('from "@granite-js/micro-frontend/runtime"');
    expect(config.preludeScript).toContain('createContainer(global.__granite.app.name');
    expect(config.preludeScript).toContain('exposeModule(__container, "./App", __expose0)');
    expect(config.banner).toContain('global._graniteMicroFrontend');
  });

  it('accepts a resolved runtime path for transitive plugin consumers', () => {
    // When
    const config = getPreludeConfig({}, '/packages/micro-frontend/runtime.js');

    // Then
    expect(config.preludeScript).toContain('from "/packages/micro-frontend/runtime.js"');
  });

  it('embeds the remote app name instead of reading the host global at evaluation time', () => {
    // When
    const config = getPreludeConfig({}, '@granite-js/micro-frontend/runtime', 'shopping');

    // Then
    expect(config.preludeScript).toContain('createContainer("shopping"');
    expect(config.preludeScript).not.toContain('global.__granite.app.name');
  });
});
