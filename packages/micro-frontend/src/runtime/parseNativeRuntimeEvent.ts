import type { MicroFrontendRuntimeEvent } from '../types';
import type { NativeMicroFrontendRuntimeEvent } from './createMicroFrontendRuntime';
import { InvalidNativeRuntimeEventError } from './errors';

function requireString(event: NativeMicroFrontendRuntimeEvent, fieldName: 'appName' | 'scheme' | 'sessionId'): string {
  const value = event.params[fieldName];
  if (typeof value !== 'string' || value.length === 0) {
    throw new InvalidNativeRuntimeEventError(event.name, fieldName);
  }
  return value;
}

export function parseNativeRuntimeEvent(event: NativeMicroFrontendRuntimeEvent): MicroFrontendRuntimeEvent {
  switch (event.name) {
    case 'preloadApp':
      return {
        name: 'preloadApp',
        params: { appName: requireString(event, 'appName') },
      };

    case 'openApp':
      return {
        name: 'openApp',
        params: {
          appName: requireString(event, 'appName'),
          scheme: requireString(event, 'scheme'),
          sessionId: requireString(event, 'sessionId'),
        },
      };

    case 'closeApp':
      return {
        name: 'closeApp',
        params: { sessionId: requireString(event, 'sessionId') },
      };

    case 'sessionVisibilityChanged': {
      const isVisible = event.params.isVisible;
      if (typeof isVisible !== 'boolean') {
        throw new InvalidNativeRuntimeEventError(event.name, 'isVisible');
      }
      return {
        name: 'sessionVisibilityChanged',
        params: {
          isVisible,
          sessionId: requireString(event, 'sessionId'),
        },
      };
    }

    default:
      throw new InvalidNativeRuntimeEventError(event.name);
  }
}
