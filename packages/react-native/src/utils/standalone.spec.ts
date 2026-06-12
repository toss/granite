import { afterEach, describe, expect, it } from 'vitest';
import { assertBrownfieldApi, isStandaloneApp } from './standalone';

function setGraniteApp(standalone: boolean | undefined) {
  (globalThis as any).__granite = {
    app: { name: 'test-app', scheme: 'granite', host: '', standalone },
  };
}

afterEach(() => {
  delete (globalThis as any).__granite;
});

describe('isStandaloneApp', () => {
  it('returns true when the app is built with standalone: true', () => {
    setGraniteApp(true);
    expect(isStandaloneApp()).toBe(true);
  });

  it('returns false when standalone is false', () => {
    setGraniteApp(false);
    expect(isStandaloneApp()).toBe(false);
  });

  it('returns false when standalone is not set (older bundles)', () => {
    setGraniteApp(undefined);
    expect(isStandaloneApp()).toBe(false);
  });

  it('returns false when granite globals are missing (host context)', () => {
    expect(isStandaloneApp()).toBe(false);
  });
});

describe('assertBrownfieldApi', () => {
  it('throws a descriptive error in standalone apps', () => {
    setGraniteApp(true);
    expect(() => assertBrownfieldApi('closeView')).toThrowError(
      /'closeView' is not available in standalone \(greenfield\) apps/
    );
  });

  it('does nothing in brownfield apps', () => {
    setGraniteApp(false);
    expect(() => assertBrownfieldApi('closeView')).not.toThrow();
  });
});
