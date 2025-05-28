/**
 * Polyfill for @swc/helpers build compatibility
 *
 * @see https://github.com/swc-project/swc/blob/v1.4.15/packages/helpers/esm/_async_iterator.js#L3
 *
 * - babel: No runtime issues after build as there is a fallback for `Symbol.asyncIterator`
 * - swc: No fallback for `Symbol.asyncIterator`, so it needs to be defined in advance
 */
export function setup() {
  if (typeof Symbol !== 'undefined' && !Symbol.asyncIterator) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    Symbol.asyncIterator = Symbol.for('@@asyncIterator');
  }
}
