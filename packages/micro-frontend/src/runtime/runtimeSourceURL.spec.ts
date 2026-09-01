import { describe, expect, it } from 'vitest';
import { captureStackFrames, resolveCurrentSourceURL, type RuntimeStackFrame } from './runtimeSourceURL';

describe('captureStackFrames', () => {
  it('returns structured CallSite file names without parsing stack strings', () => {
    expect(captureStackFrames().some(frame => frame.sourceURL === __filename)).toBe(true);
  });

  it('restores an existing prepareStackTrace hook', () => {
    const previous = Reflect.getOwnPropertyDescriptor(Error, 'prepareStackTrace');
    const prepareStackTrace = () => 'custom-stack';
    Reflect.defineProperty(Error, 'prepareStackTrace', { configurable: true, value: prepareStackTrace });

    try {
      captureStackFrames();
      expect(Reflect.get(Error, 'prepareStackTrace')).toBe(prepareStackTrace);
    } finally {
      if (previous == null) {
        Reflect.deleteProperty(Error, 'prepareStackTrace');
      } else {
        Reflect.defineProperty(Error, 'prepareStackTrace', previous);
      }
    }
  });

  it('resolves the first structured caller sourceURL', () => {
    const frames: RuntimeStackFrame[] = [
      { sourceURL: null },
      { sourceURL: 'file:///caller.js' },
    ];

    expect(resolveCurrentSourceURL(frames)).toBe('file:///caller.js');
  });
});
