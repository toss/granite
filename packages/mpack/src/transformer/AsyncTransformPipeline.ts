import { TransformPipeline, TransformStepArgs, AsyncTransformStep, TransformStepResult } from './TransformPipeline';
import { Performance, type Perf } from '../performance';

export class AsyncTransformPipeline extends TransformPipeline<AsyncTransformStep> {
  async transform(code: string, args: TransformStepArgs): Promise<TransformStepResult> {
    const context = await this.getStepContext(args);

    const before: AsyncTransformStep = (code, args, context) => {
      return this._beforeStep ? this._beforeStep(code, args, context) : Promise.resolve({ code, done: false });
    };

    const after: AsyncTransformStep = (code, args, context) => {
      return this._afterStep ? this._afterStep(code, args, context) : Promise.resolve({ code, done: true });
    };

    let result = await before(code, args, context);

    for await (const [step, config] of this.steps) {
      // 이전 step 결과가 done 인 경우 이후 step 들은 skip
      if (result.done) {
        break;
      }

      if (
        config?.conditions == null ||
        (Array.isArray(config?.conditions) && config.conditions.some((condition) => condition(result.code, args.path)))
      ) {
        let trace: Perf | undefined;
        if (typeof step.name === 'string') {
          trace = Performance.trace(`step-${step.name}`, { detail: { file: args.path } });
        }
        // 조건이 아무것도 존재하지 않거나 (기본값: 항상 실행), 조건이 충족된 경우에만 다음 step 실행
        result = await step(result.code, args, context);
        trace?.stop();

        if (config?.skipOtherSteps) {
          break;
        }
      }
    }

    return after(result.code, args, context);
  }
}
