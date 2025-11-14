import { assertType, describe, it } from 'vitest';
import { z } from 'zod';
import { createRoute, useNavigation, useParams } from './createRoute';

declare module './createRoute' {
  interface RegisterScreenInput {
    '/test': {
      id: string;
      name: string;
    };
    '/test-schema': {
      id: string;
      count: number;
    };
    '/test-transform': {
      id: string;
    };
    '/test-with-defaults': {
      animation?: boolean;
    };
  }

  interface RegisterScreen {
    '/test': {
      id: string;
      name: string;
    };
    '/test-schema': {
      id: string;
      count: number;
    };
    '/test-transform': {
      id: number;
    };
    '/test-with-defaults': {
      animation: boolean;
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

describe('createRoute with StandardSchema', () => {
  it('should infer correct type from StandardSchema', () => {
    const RouteWithSchema = createRoute('/test-schema', {
      component: () => null,
      validateParams: z.object({
        id: z.string(),
        count: z.number(),
      }),
    });

    assertType<{
      id: string;
      count: number;
    }>(RouteWithSchema.useParams());
  });

  it('should infer output type from transformation', () => {
    const RouteWithTransform = createRoute('/test-transform', {
      component: () => null,
      validateParams: z.object({
        id: z.string().transform((v) => parseInt(v)),
      }),
    });

    // Should be number (output), not string (input)
    assertType<{
      id: number;
    }>(RouteWithTransform.useParams());
  });

  it('should work with useParams hook', () => {
    createRoute('/test-schema', {
      component: () => null,
      validateParams: z.object({
        id: z.string(),
        count: z.number(),
      }),
    });

    assertType<{
      id: string;
      count: number;
    }>(useParams({ from: '/test-schema' }));
  });

  it('should separate input and output types with defaults', () => {
    const RouteWithDefaults = createRoute('/test-with-defaults', {
      component: () => null,
      validateParams: z.object({
        animation: z.boolean().default(true),
      }),
    });

    // useParams returns output type (required)
    assertType<{ animation: boolean }>(RouteWithDefaults.useParams());

    // navigation.navigate should accept input type (optional)
    const navigation = useNavigation();

    // Should accept with animation parameter
    navigation.navigate('/test-with-defaults', { animation: false });

    // Should accept without animation parameter (default will be used)
    navigation.navigate('/test-with-defaults', {});
  });
});
