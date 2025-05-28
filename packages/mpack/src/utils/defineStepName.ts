import type { AsyncTransformStep } from '../transformer/TransformPipeline';

export function defineStepName(step: AsyncTransformStep, name: string) {
  Object.defineProperty(step, 'name', { value: name });
}
