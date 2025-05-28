import { EventEmitterSchema } from './types';

/**
 * @name VisibilityChangedEventEmitter
 * @kind typedef
 * @platform iOS
 * @description
 * Emits an event when the visibility state of the app changes.
 * Only available on iOS.
 */
export type VisibilityChangedEventEmitter = EventEmitterSchema<'visibilityChanged', [boolean]>;
