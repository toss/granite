import { useEffect, useRef } from 'react';

/**
 * @name usePrevious
 * @category Hooks
 * @kind function
 * @description
 * A Hook that returns the previous value.
 * @param {T} value - The value to return the previous value of.
 * @returns {T} - Returns the previous value.
 * @example
 * ```typescript
 *  const isVisible = useVisibility();
 *  const prevValue = usePrevious<boolean>(isVisible) ?? false;
 * ```
 */
export function usePrevious<T>(value: T): T {
  const ref: any = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
