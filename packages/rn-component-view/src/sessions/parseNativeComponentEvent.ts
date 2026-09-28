import type { NativeRNComponentEvent } from '../specs/NativeGraniteRNComponentSessions';
import type { RNComponentEvent, RNComponentViewSizing } from '../types';
import { InvalidNativeComponentEventError } from './errors';

function requireString(
  event: NativeRNComponentEvent,
  fieldName: 'bundleFilePath' | 'componentName' | 'sessionId'
): string {
  const value = event.params[fieldName];
  if (typeof value !== 'string' || value.length === 0) {
    throw new InvalidNativeComponentEventError(event.name, fieldName);
  }
  return value;
}

function requireProps(event: NativeRNComponentEvent): Readonly<Record<string, unknown>> {
  const props: unknown = event.params.props;
  if (typeof props !== 'object' || props == null || Array.isArray(props)) {
    throw new InvalidNativeComponentEventError(event.name, 'props');
  }
  return props as Readonly<Record<string, unknown>>;
}

function requireSizing(event: NativeRNComponentEvent): RNComponentViewSizing {
  const sizing = event.params.sizing;
  switch (sizing) {
    case 'contentHeight':
    case 'contentSize':
    case 'constrained':
      return sizing;
    default:
      throw new InvalidNativeComponentEventError(event.name, 'sizing');
  }
}

export function parseNativeComponentEvent(event: NativeRNComponentEvent): RNComponentEvent {
  switch (event.name) {
    case 'openComponent':
      return {
        name: 'openComponent',
        params: {
          sessionId: requireString(event, 'sessionId'),
          componentName: requireString(event, 'componentName'),
          props: requireProps(event),
          sizing: requireSizing(event),
          ...(event.params.bundleFilePath == null ? {} : { bundleFilePath: requireString(event, 'bundleFilePath') }),
        },
      };

    case 'updateComponentProps':
      return {
        name: 'updateComponentProps',
        params: { sessionId: requireString(event, 'sessionId'), props: requireProps(event) },
      };

    case 'closeComponent':
      return {
        name: 'closeComponent',
        params: { sessionId: requireString(event, 'sessionId') },
      };

    default:
      throw new InvalidNativeComponentEventError(event.name);
  }
}
