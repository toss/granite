import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VisibilityChangedProvider, useVisibilityChanged } from './useVisibilityChanged';

describe('VisibilityChangedProvider', () => {
  it('keeps a child visible when every visibility boundary is visible', () => {
    // Given
    let receivedVisibility: boolean | null = null;

    function Consumer() {
      receivedVisibility = useVisibilityChanged();
      return null;
    }

    // When
    render(
      <VisibilityChangedProvider isVisible={true}>
        <VisibilityChangedProvider isVisible={true}>
          <Consumer />
        </VisibilityChangedProvider>
      </VisibilityChangedProvider>
    );

    // Then
    expect(receivedVisibility).toBe(true);
  });

  it('keeps a child hidden when an outer visibility boundary is hidden', () => {
    // Given
    let receivedVisibility: boolean | null = null;

    function Consumer() {
      receivedVisibility = useVisibilityChanged();
      return null;
    }

    // When
    render(
      <VisibilityChangedProvider isVisible={false}>
        <VisibilityChangedProvider isVisible={true}>
          <Consumer />
        </VisibilityChangedProvider>
      </VisibilityChangedProvider>
    );

    // Then
    expect(receivedVisibility).toBe(false);
  });
});
