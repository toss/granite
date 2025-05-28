export interface EventEmitterSchema<K extends string, P extends unknown[]> {
  name: K;
  params: P;
}
