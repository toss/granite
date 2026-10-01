import type { MicroFrontendLifecycleEvent } from '../types';

const lifecycleCallbackByRuntime = new WeakMap<object, (event: MicroFrontendLifecycleEvent) => void>();

export function setMicroFrontendLifecycleCallback(
  runtime: object,
  callback: ((event: MicroFrontendLifecycleEvent) => void) | undefined
): void {
  if (callback == null) {
    lifecycleCallbackByRuntime.delete(runtime);
    return;
  }

  lifecycleCallbackByRuntime.set(runtime, callback);
}

export function emitMicroFrontendLifecycleEvent(runtime: object, event: MicroFrontendLifecycleEvent): void {
  const callback = lifecycleCallbackByRuntime.get(runtime);
  if (callback == null) {
    return;
  }

  try {
    callback(event);
  } catch (error) {
    console.error('Failed to run a micro-frontend lifecycle callback', error);
  }
}
