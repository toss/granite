import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Type guard to check if a value is a StandardSchema v1 compliant schema
 */
export function isStandardSchema(value: unknown): value is StandardSchemaV1 {
  return typeof value === 'object' && value !== null && '~standard' in value;
}

/**
 * Infer the output type from a StandardSchema
 */
export type InferOutput<TSchema> = TSchema extends StandardSchemaV1<any, infer Output> ? Output : never;

/**
 * Infer the input type from a StandardSchema
 */
export type InferInput<TSchema> = TSchema extends StandardSchemaV1<infer Input, any> ? Input : never;
