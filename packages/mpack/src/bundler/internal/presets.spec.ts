import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { getReactNativeConsolePolyfillBanner } from './presets';

const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => {
    fs.rmSync(directory, { force: true, recursive: true });
  });
});

describe('getReactNativeConsolePolyfillBanner', () => {
  it('evaluates React Native polyfills before the bundled module graph', () => {
    const reactNativePath = fs.mkdtempSync(path.join(os.tmpdir(), 'mpack-react-native-'));
    temporaryDirectories.push(reactNativePath);
    const polyfillPath = path.join(reactNativePath, 'console.js');
    fs.writeFileSync(polyfillPath, 'global.console = { ready: true };');
    fs.writeFileSync(
      path.join(reactNativePath, 'rn-get-polyfills.js'),
      `module.exports = () => [${JSON.stringify(polyfillPath)}];`,
    );

    const banner = getReactNativeConsolePolyfillBanner({
      reactNativePath,
      rootDir: reactNativePath,
    });
    const result = Function(
      'global',
      `${banner}\nreturn global.console.ready;`,
    )({});

    expect(result).toBe(true);
  });

  it('omits React Native polyfills when a host runtime already installed them', () => {
    expect(
      getReactNativeConsolePolyfillBanner({
        reactNativePath: '/does-not-need-to-exist',
        rootDir: '/does-not-need-to-exist',
        skipReactNativePolyfills: true,
      }),
    ).toBe('');
  });
});
