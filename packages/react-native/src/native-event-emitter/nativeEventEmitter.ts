import { EmitterSubscription, NativeEventEmitter } from 'react-native';
import { EventEmitters } from './eventEmitters';
import { GraniteCoreModule } from '../native-modules';
import { EventEmitterSchema } from './eventEmitters/types';

type MapOf<T> = T extends EventEmitterSchema<infer K, any> ? { [key in K]: T } : never;
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
type EventEmittersMap = UnionToIntersection<MapOf<EventEmitters>>;
type EventKeys = keyof EventEmittersMap;
type ParamOf<K extends EventKeys> = EventEmittersMap[K]['params'];
interface EventEmitter {
  addListener<Event extends EventKeys>(
    event: Event,
    callback: (...params: ParamOf<Event>) => void
  ): EmitterSubscription;
}

export const nativeEventEmitter = new NativeEventEmitter(GraniteCoreModule) as unknown as EventEmitter;
