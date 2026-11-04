import { createRoute as legacyCreateRoute, useParams as legacyUseParams } from '@granite-js/react-native';
import { createRoute, useParams } from '@granite-js/router';
import { assertType, describe, it } from 'vitest';

declare module '@granite-js/react-native' {
  interface RegisterScreenInput {
    '/legacy-entry': { id: string };
  }
  interface RegisterScreen {
    '/legacy-entry': { id: string };
  }
}
declare module '@granite-js/router' {
  interface RegisterScreenInput {
    '/package-entry': { count: number };
  }
  interface RegisterScreen {
    '/package-entry': { count: number };
  }
}

describe('route type re-exports', () => {
  it('shares legacy and canonical module augmentations', () => {
    createRoute('/legacy-entry', { component: () => null });
    legacyCreateRoute('/package-entry', { component: () => null });
    assertType<{ id: string }>(useParams({ from: '/legacy-entry' }));
    assertType<{ count: number }>(legacyUseParams({ from: '/package-entry' }));
    // @ts-expect-error Unknown routes remain rejected through the legacy entry.
    legacyCreateRoute('/unknown', { component: () => null });
  });
});
