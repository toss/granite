import { describe, expect, it } from 'vitest';
import { getPreludeConfig } from './prelude';

describe('getPreludeConfig', () => {
  it('registers the Granite app container and exposed modules directly in the prelude', () => {
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
    expect(config.preludeScript).not.toContain('@granite-js/micro-frontend');
    expect(config.preludeScript).toContain('global._graniteMicroFrontend.containers');
    expect(config.preludeScript).toContain('createContainer(global.__granite.app.name');
    expect(config.preludeScript).toContain('exposeModule(__container, "./App", __expose0)');
    expect(config.banner).toContain('global._graniteMicroFrontend');
  });

  it('creates a container without importing a private runtime entry', () => {
    // When
    const config = getPreludeConfig({});

    // Then
    expect(config.preludeScript).not.toContain('import { createContainer');
    expect(config.preludeScript).toContain('global._graniteMicroFrontend.containers');
  });

  it('embeds the remote app name instead of reading the host global at evaluation time', () => {
    // When
    const config = getPreludeConfig({}, 'shopping');

    // Then
    expect(config.preludeScript).toContain('createContainer("shopping"');
    expect(config.preludeScript).not.toContain('global.__granite.app.name');
  });
});
