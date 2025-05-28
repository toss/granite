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

interface TransformStepConfig {
  /**
   * step 을 실행하기 위한 조건 (기본값: 항상 실행)
   */
  conditions?: Array<(code: string, path: string) => boolean>;
  /**
   * 현재 step 이 실행된 경우 done 처리 여부 (기본값: false)
   */
  skipOtherSteps?: boolean;
}

export type AsyncTransformStep = TransformStep<Promise<TransformStepResult>>;

export abstract class TransformPipeline<Step extends TransformStep<unknown>> {
  protected _beforeStep?: Step;
  protected _afterStep?: Step;
  protected steps: Array<[Step, TransformStepConfig | null]> = [];

  beforeStep(step: Step): this {
    this._beforeStep = step;
    return this;
  }

  afterStep(step: Step): this {
    this._afterStep = step;
    return this;
  }

  addStep(step: Step, config?: TransformStepConfig): this {
    this.steps.push([step, config ?? null]);
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
