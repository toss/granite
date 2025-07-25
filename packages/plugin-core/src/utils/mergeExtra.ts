export function mergeExtra<T1 extends object, T2 extends object>(source?: T1, target?: T2) {
  if (!(source || target)) {
    return undefined;
  }

  if (source == null) {
    return target;
  }

  if (target == null) {
    return source;
  }

  return { ...source, ...target };
}
