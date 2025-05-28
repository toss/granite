export function isNoSuchKeyError<E extends Error>(error: E) {
  return error.name === 'NoSuchKey';
}
