import { assertType, describe, it } from 'vitest';
import { z } from 'zod';
import {
  createRoute,
  useNavigation,
  useParams,
  useReplaceParams,
  useSetParams,
} from './createRoute';

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
    '/test-optional': {
      uri?: string;
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
    '/test-optional': {
      uri?: string;
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

  it('useSetParams and useReplaceParams', () => {
    const setRouteParams = Route.useSetParams();

    assertType<(params: Partial<{ id: string; name: string }>) => void>(setRouteParams);
    setRouteParams({ id: 'test-id' });
    setRouteParams({ name: 'test-name' });

    // @ts-expect-error Type error should occur when param type is invalid
    setRouteParams({ id: 123 });

    // @ts-expect-error Type error should occur when param key is invalid
    setRouteParams({ count: 123 });

    const setParams = useSetParams({ from: '/test' });
    setParams({ id: 'test-id' });

    // @ts-expect-error Type error should occur when path is not registered
    assertType(useSetParams({ from: '/abcdefg' }));

    // @ts-expect-error Type error should occur since 'from' and 'strict: false' are conflicting options
    assertType(useSetParams({ from: '/test', strict: false }));

    const replaceRouteParams = Route.useReplaceParams();

    assertType<(params: { id: string; name: string }) => void>(replaceRouteParams);
    replaceRouteParams({ id: 'test-id', name: 'test-name' });

    // @ts-expect-error Type error should occur when required params are missing
    replaceRouteParams({ id: 'test-id' });

    // @ts-expect-error Type error should occur when param type is invalid
    replaceRouteParams({ id: 123, name: 'test-name' });

    // @ts-expect-error Type error should occur when param key is invalid
    replaceRouteParams({ id: 'test-id', name: 'test-name', count: 123 });

    const replaceParams = useReplaceParams({ from: '/test' });
    replaceParams({ id: 'test-id', name: 'test-name' });

    // @ts-expect-error Type error should occur when path is not registered
    assertType(useReplaceParams({ from: '/abcdefg' }));

    // @ts-expect-error Type error should occur since 'from' and 'strict: false' are conflicting options
    assertType(useReplaceParams({ from: '/test', strict: false }));
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

    // @ts-expect-error Type error should occur when a required params object is missing
    navigation.navigate('/test-schema');

    // @ts-expect-error Type error should occur when navigate param type is invalid
    navigation.navigate('/test-schema', { id: 'test', count: 'invalid' });

    // @ts-expect-error Type error should occur when navigating to an unregistered path
    navigation.navigate('/abcdefg');

    navigation.navigate('/test-optional', {});
    navigation.navigate('/test-optional', { uri: 'test-uri' });

    // @ts-expect-error Type error should occur when navigate params include an unknown key
    navigation.navigate('/test-optional', { name: '123' });

    navigation.popTo('/test-optional', { uri: 'test-uri' });

    // @ts-expect-error popTo should already reject unknown param keys
    navigation.popTo('/test-optional', { name: '123' });

    navigation.push('/test-optional', { uri: 'test-uri' });

    // @ts-expect-error push should reject unknown param keys
    navigation.push('/test-optional', { name: '123' });

    navigation.replace('/test-optional', { uri: 'test-uri' });

    // @ts-expect-error replace should reject unknown param keys
    navigation.replace('/test-optional', { name: '123' });

    // @ts-expect-error push should require params for required route params
    navigation.push('/test-schema');

    // @ts-expect-error replace should require params for required route params
    navigation.replace('/test-schema');

    // @ts-expect-error popTo should require params for required route params
    navigation.popTo('/test-schema');
  });

  it('should infer output type from transformation', () => {
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

    const setParams = RouteWithTransform.useSetParams();
    setParams({ id: 'test-id' });

    // @ts-expect-error setParams should accept input type, not output type
    setParams({ id: 123 });

    const setParamsFromHook = useSetParams({ from: '/test-transform' });
    setParamsFromHook({ id: 'test-id' });

    // @ts-expect-error useSetParams should accept input type, not output type
    setParamsFromHook({ id: 123 });

    const replaceParams = RouteWithTransform.useReplaceParams();
    replaceParams({ id: 'test-id' });

    // @ts-expect-error useReplaceParams should accept input type, not output type
    replaceParams({ id: 123 });

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

    const setParams = RouteWithDefaults.useSetParams();
    setParams({});
    setParams({ animation: false });

    const replaceParams = RouteWithDefaults.useReplaceParams();
    replaceParams({});
    replaceParams({ animation: false });
  });
});
