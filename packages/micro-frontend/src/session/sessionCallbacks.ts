export function runSessionCallback<T>(callback: () => T): T | undefined {
  try {
    return callback();
  } catch (error) {
    // no-excuse-ok: catch -- Consumer callbacks must not interrupt other subscribers or session teardown.
    console.error('Failed to run a micro-frontend session callback', error);
    return undefined;
  }
}
