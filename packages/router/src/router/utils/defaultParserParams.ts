/**
 * Parses URL query string and converts it to an object.
 * @param params - Query string to parse
 * @returns Parsed query object
 * @example
 * // Input: { foo: '123', bar: 'true' }
 * // Output: { foo: 123, bar: true }
 */
export function defaultParserParams(params?: Record<string, string>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params ?? {}).map(([key, value]) => {
      try {
        return [key, JSON.parse(value)];
      } catch {
        return [key, value];
      }
    })
  );
}
