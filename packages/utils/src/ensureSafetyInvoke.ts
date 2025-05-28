type Fn<T> = (...args: any[]) => T;

export function ensureSafetyInvokeSync<T>(fn: Fn<T>): Fn<T | null> {
  return (...args: any[]) => {
    try {
      return fn.call(null, ...args);
    } catch (error) {
      console.error(error);
      return null;
    }
  };
}
