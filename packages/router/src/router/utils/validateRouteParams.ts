import type { StandardSchemaV1 } from '@standard-schema/spec';
import { isStandardSchema } from './standardSchema';

/**
 * Validates route parameters using either a StandardSchema or a validation function.
 *
 * @param validateParams - The validation schema or function to apply
 * @param parsedParams - The parsed parameters to validate
 * @returns The validated parameters
 * @throws Error if validation fails or async validation is attempted
 */
export function validateRouteParams(
  validateParams: ((params: Readonly<object | undefined>) => any) | StandardSchemaV1<any, any>,
  parsedParams: Readonly<object | undefined>
): any {
  // Check if validateParams is a StandardSchema
  if (isStandardSchema(validateParams)) {
    const result = validateParams['~standard'].validate(parsedParams);

    // Handle async results
    if (result instanceof Promise) {
      throw new Error('Async validation is not supported');
    }

    // Handle validation failures
    if ('issues' in result && result.issues) {
      const messages = result.issues.map((i) => i.message).join(', ');
      throw new Error(`Parameter validation failed: ${messages}`);
    }

    return result.value;
  }

  // Function pattern
  if (typeof validateParams === 'function') {
    return validateParams(parsedParams);
  }

  return parsedParams;
}
