import { describe, expect, it, vi } from 'vitest';
import type { InitialProps } from '../initial-props';
import { resolveInitialScheme } from './resolveInitialScheme';

const INITIAL_PROPS: InitialProps = {
  platform: 'ios',
  initialColorPreference: 'light',
  scheme: 'granite://catalog/products/42',
};

describe('resolveInitialScheme', () => {
  it('uses the configured initial scheme before native initial props', () => {
    // Given
    const getFallbackScheme = vi.fn(() => 'granite://fallback');

    // When
    const result = resolveInitialScheme('granite://configured', INITIAL_PROPS, getFallbackScheme);

    // Then
    expect(result).toBe('granite://configured');
    expect(getFallbackScheme).not.toHaveBeenCalled();
  });

  it('uses the session scheme from native initial props when no scheme is configured', () => {
    // Given
    const getFallbackScheme = vi.fn(() => 'granite://fallback');

    // When
    const result = resolveInitialScheme(undefined, INITIAL_PROPS, getFallbackScheme);

    // Then
    expect(result).toBe('granite://catalog/products/42');
    expect(getFallbackScheme).not.toHaveBeenCalled();
  });

  it('uses the platform fallback when neither configuration nor initial props contain a scheme', () => {
    // Given
    const initialProps: InitialProps = {
      platform: 'ios',
      initialColorPreference: 'light',
    };
    const getFallbackScheme = vi.fn(() => 'granite://fallback');

    // When
    const result = resolveInitialScheme(undefined, initialProps, getFallbackScheme);

    // Then
    expect(result).toBe('granite://fallback');
    expect(getFallbackScheme).toHaveBeenCalledOnce();
  });
});
