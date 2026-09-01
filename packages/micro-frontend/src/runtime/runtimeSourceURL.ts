export interface RuntimeStackFrame {
  readonly sourceURL: string | null;
}

export function captureStackFrames(): readonly RuntimeStackFrame[] {
  const prepareStackTraceDescriptor = Object.getOwnPropertyDescriptor(Error, 'prepareStackTrace');
  Object.defineProperty(Error, 'prepareStackTrace', {
    configurable: true,
    value: (_error: unknown, callSites: readonly unknown[]) => callSites,
    writable: true,
  });

  const frames: RuntimeStackFrame[] = [];
  try {
    const callSites: unknown = new Error().stack;
    if (!Array.isArray(callSites)) {
      throw new Error('Cannot capture structured micro-frontend stack frames');
    }
    for (const callSite of callSites) {
      if (typeof callSite !== 'object' || callSite == null) {
        continue;
      }
      if (!('getFileName' in callSite)) {
        continue;
      }
      const getFileName: unknown = 'getFileName' in callSite ? callSite.getFileName : undefined;
      const sourceURL: unknown = typeof getFileName === 'function' ? getFileName.call(callSite) : null;
      frames.push({ sourceURL: typeof sourceURL === 'string' ? sourceURL : null });
    }
  } finally {
    if (prepareStackTraceDescriptor == null) {
      Reflect.deleteProperty(Error, 'prepareStackTrace');
    } else {
      Object.defineProperty(Error, 'prepareStackTrace', prepareStackTraceDescriptor);
    }
  }

  return frames;
}

export function resolveCurrentSourceURL(frames: readonly RuntimeStackFrame[]): string {
  for (const frame of frames) {
    if (frame.sourceURL != null && frame.sourceURL.length > 0) {
      return frame.sourceURL;
    }
  }
  throw new Error('Cannot determine the caller micro-frontend sourceURL');
}
