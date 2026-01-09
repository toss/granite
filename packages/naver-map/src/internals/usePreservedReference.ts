import { useRef } from 'react';

/**
 * Returns a memoized reference that only changes when the object's content changes.
 * This is useful for preventing unnecessary re-renders when object references change
 * but the content remains the same.
 */
export function usePreservedReference<T>(value: T): T {
  const ref = useRef<T>(value);

  if (!shallowEqual(ref.current, value)) {
    ref.current = value;
  }

  return ref.current;
}

function shallowEqual<T>(a: T, b: T): boolean {
  if (a === b) {
    return true;
  }

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }

  const keysA = Object.keys(a) as (keyof T)[];
  const keysB = Object.keys(b) as (keyof T)[];

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    if (a[key] !== b[key]) {
      return false;
    }
  }

  return true;
}
