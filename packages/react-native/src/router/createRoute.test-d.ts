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

  it('should infer _inputType and _outputType without undefined for function pattern', () => {
    type InputType = (typeof Route)['_inputType'];
    type OutputType = (typeof Route)['_outputType'];

    // _inputType should be inferred as the exact type, not a union with undefined
    assertType<{
      id: string;
      name: string;
    }>({} as InputType);

    // _outputType should be inferred as the exact type, not a union with undefined
    assertType<{
      id: string;
      name: string;
    }>({} as OutputType);

    // Verify that undefined is not part of the union
    type InputHasUndefined = undefined extends InputType ? true : false;
    type OutputHasUndefined = undefined extends OutputType ? true : false;

    assertType<false>({} as InputHasUndefined);
    assertType<false>({} as OutputHasUndefined);
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

  it('should infer _inputType and _outputType without undefined', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const RouteWithSchema = createRoute('/test-schema', {
      component: () => null,
      validateParams: z.object({
        id: z.string(),
        count: z.number(),
      }),
    });

    type InputType = (typeof RouteWithSchema)['_inputType'];
    type OutputType = (typeof RouteWithSchema)['_outputType'];
    type UseParamsReturnType = ReturnType<(typeof RouteWithSchema)['useParams']>;

    // _inputType should be inferred as the exact type, not a union with undefined
    assertType<{
      id: string;
      count: number;
    }>({} as InputType);

    // _outputType should be inferred as the exact type, not a union with undefined
    assertType<{
      id: string;
      count: number;
    }>({} as OutputType);

    // useParams should return the exact type, not a union with undefined
    assertType<{
      id: string;
      count: number;
    }>({} as UseParamsReturnType);

    // Verify that undefined is not part of the union for all types
    type InputHasUndefined = undefined extends InputType ? true : false;
    type OutputHasUndefined = undefined extends OutputType ? true : false;
    type UseParamsHasUndefined = undefined extends UseParamsReturnType ? true : false;

    assertType<false>({} as InputHasUndefined);
    assertType<false>({} as OutputHasUndefined);
    assertType<false>({} as UseParamsHasUndefined);

    // useNavigation should accept input type for navigate parameters
    const navigation = useNavigation();

    // Should accept exact input type
    navigation.navigate('/test-schema', { id: 'test', count: 123 });
  });

  it('should infer output type from transformation', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const RouteWithTransform = createRoute('/test-transform', {
      component: () => null,
      validateParams: z.object({
        id: z.string().transform((v) => parseInt(v)),
      }),
    });

    type InputType = (typeof RouteWithTransform)['_inputType'];
    type OutputType = (typeof RouteWithTransform)['_outputType'];
    type UseParamsReturnType = ReturnType<(typeof RouteWithTransform)['useParams']>;

    // _inputType should be string (before transformation)
    assertType<{
      id: string;
    }>({} as InputType);

    // _outputType should be number (after transformation)
    assertType<{
      id: number;
    }>({} as OutputType);

    // useParams should return output type (number)
    assertType<{
      id: number;
    }>({} as UseParamsReturnType);

    // useNavigation should accept input type (string)
    const navigation = useNavigation();
    navigation.navigate('/test-transform', { id: 'test-id' });

    // Verify that input and output types are different
    type InputIsString = InputType extends { id: string } ? true : false;
    type OutputIsNumber = OutputType extends { id: number } ? true : false;

    assertType<true>({} as InputIsString);
    assertType<true>({} as OutputIsNumber);
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
