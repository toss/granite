import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { getPreludeConfig } from './prelude';

function evaluate(appName: string, globalObject: object) {
  const config = getPreludeConfig({}, appName);
  vm.runInNewContext(
    `${config.banner}\n(function () {${config.preludeScript}})();`,
    { global: globalObject },
    { filename: `file:///${appName}.hbc` }
  );
}

function containerConfig(globalObject: object, appName: string): unknown {
  return Reflect.get(Reflect.get(Reflect.get(globalObject, '__MICRO_FRONTEND__'), '__CONTAINERS__'), appName).config;
}

describe('generated container app configuration', () => {
  it('snapshots each app configuration before the next bundle changes the globals', () => {
    // Given
    const app = { name: 'app-a', scheme: 'alpha', host: 'host-a' };
    const globalObject = { __granite: { app } };
    evaluate('app-a', globalObject);

    // When
    Object.assign(app, { name: 'app-b', scheme: 'beta', host: 'host-b' });
    evaluate('app-b', globalObject);

    // Then
    expect(containerConfig(globalObject, 'app-a')).toEqual({ scheme: 'alpha', host: 'host-a' });
    expect(containerConfig(globalObject, 'app-b')).toEqual({ scheme: 'beta', host: 'host-b' });
  });

  it('keeps the existing container contract when app globals are absent', () => {
    // Given
    const globalObject = {};

    // When
    evaluate('legacy-app', globalObject);

    // Then
    expect(containerConfig(globalObject, 'legacy-app')).toEqual({});
  });

  it('does not capture another app configuration', () => {
    // Given
    const globalObject = { __granite: { app: { name: 'host-app', scheme: 'host', host: 'main' } } };

    // When
    evaluate('remote-app', globalObject);

    // Then
    expect(containerConfig(globalObject, 'remote-app')).toEqual({});
  });
});
