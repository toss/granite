import * as fs from 'fs/promises';
import { Performance } from '../performance';
import { md5 } from '../utils/md5';

export interface TransformStepArgs {
  path: string;
}

export interface TransformStepContext {
  key: string;
  mtimeMs: number;
}

export interface TransformStepResult {
  code: string;
  done?: boolean;
}

interface TransformStep<TransformResult> {
  (code: string, args: TransformStepArgs, context: TransformStepContext): TransformResult;
  name?: string;
}

export type AsyncTransformStep = TransformStep<Promise<TransformStepResult>>;

// New conditional step interface
export interface ConditionalStep {
  if: (args: { path: string; code: string }) => boolean;
  then: AsyncTransformStep;
  else?: AsyncTransformStep;
  stopAfter?: boolean;
}

// Step input can be either a function or a conditional
export type StepInput = AsyncTransformStep | ConditionalStep;

interface StepEntry {
  type: 'normal' | 'conditional';
  step?: AsyncTransformStep;
  condition?: ConditionalStep;
}

export abstract class TransformPipeline<Step extends TransformStep<unknown>> {
  protected _beforeStep?: Step;
  protected _afterStep?: Step;
  protected steps: StepEntry[] = [];

  beforeStep(step: Step): this {
    this._beforeStep = step;
    return this;
  }

  afterStep(step: Step): this {
    this._afterStep = step;
    return this;
  }

  addStep(step: StepInput): this {
    if (typeof step === 'function') {
      this.steps.push({ type: 'normal', step: step as AsyncTransformStep });
    } else {
      this.steps.push({ type: 'conditional', condition: step as ConditionalStep });
    }
    return this;
  }

  async getStepContext(args: TransformStepArgs): Promise<TransformStepContext> {
    const trace = Performance.trace('get-step-context');
    const { mtimeMs } = await fs.stat(args.path);
    const key = md5(args.path, mtimeMs);
    trace.stop();

    return { key, mtimeMs };
  }

  abstract transform(code: string, args: TransformStepArgs): ReturnType<Step>;
}
