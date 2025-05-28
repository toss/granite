import { assertType, describe, it } from 'vitest';
import { createRoute, useParams } from './createRoute';

declare module './createRoute' {
  interface RegisterScreen {
    '/test': {
      id: string;
      name: string;
    };
  }
}

describe('createRoute', () => {
  const Route = createRoute('/test', {
    component: () => null,
    validateParams: (params) => params as { id: string; name: string },
  });

  it('useParams', () => {
    assertType<{
      id: string;
      name: string;
    }>(Route.useParams());

    assertType<Readonly<object | undefined>>(useParams({ strict: false }));

    // @ts-expect-error - Type error should occur when strict is false
    assertType<{ id: string; name: string }>(useParams({ strict: false }));

    assertType<{
      id: string;
      name: string;
    }>(useParams({ from: '/test', strict: true }));

    assertType<{
      id: string;
      name: string;
    }>(useParams({ from: '/test' }));

    // @ts-expect-error Type error should occur when no options
    assertType(useParams());

    // @ts-expect-error Type error should occur when empty object
    assertType(useParams({}));

    // @ts-expect-error Type error should occur when path is not registered
    assertType(useParams({ from: '/abcdefg' }));

    // @ts-expect-error Type error should occur since 'from' and 'strict: false' are conflicting options
    assertType(useParams({ from: '/test', strict: false }));
  });
});
