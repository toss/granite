import { describe, expect, it, vi } from 'vitest';
import { resolveInitialScheme } from './resolveInitialScheme';

describe('resolveInitialScheme', () => {
  it('uses the scheme passed to the registered App before the registerApp initialScheme option', () => {
    const getSchemeUri = vi.fn(() => 'bridge://fallback');

    expect(
      resolveInitialScheme({
        initialPropsScheme: 'prop://initial?foo=bar',
        initialScheme: 'option://initial',
        getSchemeUri,
      })
    ).toBe('prop://initial?foo=bar');
    expect(getSchemeUri).not.toHaveBeenCalled();
  });

  it('uses the registerApp initialScheme option when the registered App does not receive a scheme', () => {
    const getSchemeUri = vi.fn(() => 'bridge://fallback');

    expect(
      resolveInitialScheme({
        initialScheme: 'option://initial',
        getSchemeUri,
      })
    ).toBe('option://initial');
    expect(getSchemeUri).not.toHaveBeenCalled();
  });

  it('falls back to getSchemeUri when neither source provides a scheme', () => {
    const getSchemeUri = vi.fn(() => 'bridge://fallback');

    expect(resolveInitialScheme({ getSchemeUri })).toBe('bridge://fallback');
    expect(getSchemeUri).toHaveBeenCalledTimes(1);
  });
});
