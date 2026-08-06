import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { ParserParams, ValidateParams } from './types';

type ResolvedParams =
  | { readonly status: 'resolved'; readonly value: Readonly<object> }
  | { readonly status: 'invalid'; readonly cause?: Error };

export function resolveHostSkeletonParams(
  rawParams: Record<string, unknown>,
  parserParams: ParserParams | undefined,
  validateParams: ValidateParams<Readonly<object> | undefined> | undefined
): ResolvedParams {
  const parsedParams = (parserParams ?? defaultParserParams)(rawParams);

  if (validateParams == null) {
    return { status: 'resolved', value: parsedParams };
  }

  try {
    if (isStandardSchema(validateParams)) {
      const result = validateParams['~standard'].validate(parsedParams);

      if (result instanceof Promise) {
        return { status: 'invalid', cause: new Error('Async host skeleton validation is not supported') };
      }

      if (result.issues != null) {
        return {
          status: 'invalid',
          cause: new Error(result.issues.map(issue => issue.message).join(', ')),
        };
      }

      return { status: 'resolved', value: result.value ?? {} };
    }

    return { status: 'resolved', value: validateParams(parsedParams) ?? {} };
  } catch (error) {
    return {
      status: 'invalid',
      cause: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

function defaultParserParams(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value !== 'string') {
        return [key, value];
      }

      try {
        return [key, JSON.parse(value)];
      } catch (error) {
        if (!(error instanceof SyntaxError)) {
          throw error;
        }

        return [key, value];
      }
    })
  );
}

function isStandardSchema<TParams extends Readonly<object> | undefined>(
  value: ValidateParams<TParams>
): value is StandardSchemaV1<unknown, TParams> {
  return typeof value === 'object' && value !== null && '~standard' in value;
}
