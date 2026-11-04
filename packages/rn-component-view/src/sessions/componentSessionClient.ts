import { createComponentSessionClient, type ComponentSessionClient } from './createComponentSessionClient';
import { parseNativeComponentEvent } from './parseNativeComponentEvent';
import { getNativeGraniteRNComponentSessions } from '../specs/NativeGraniteRNComponentSessions';

let componentSessionClient: ComponentSessionClient | undefined;

/** The client of the native module in this JavaScript runtime. */
export function getComponentSessionClient(): ComponentSessionClient {
  componentSessionClient ??= createComponentSessionClient({
    getNativeModule: getNativeGraniteRNComponentSessions,
    parseEvent: parseNativeComponentEvent,
  });
  return componentSessionClient;
}
