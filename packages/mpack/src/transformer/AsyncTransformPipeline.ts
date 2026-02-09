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

    // Process all steps with if-then-else logic
    for await (const entry of this.steps) {
      // Check if pipeline should stop
      if (result.done) {
        break;
      }

      if (entry.type === 'normal' && entry.step) {
        // Normal function step
        let trace: Perf | undefined;
        if (typeof entry.step.name === 'string') {
          trace = Performance.trace(`step-${entry.step.name}`, { detail: { file: args.path } });
        }
        result = await entry.step(result.code, args, context);
        trace?.stop();
      } else if (entry.type === 'conditional' && entry.condition) {
        // Conditional step with if-then-else logic
        const condition = entry.condition;

        if (condition.if({ path: args.path, code: result.code })) {
          // Execute 'then' branch
          let trace: Perf | undefined;
          if (typeof condition.then.name === 'string') {
            trace = Performance.trace(`step-${condition.then.name}`, { detail: { file: args.path } });
          }
          result = await condition.then(result.code, args, context);
          trace?.stop();

          // Check stopAfter flag
          if (condition.stopAfter) {
            break;
          }
        } else if (condition.else) {
          // Execute 'else' branch if present
          let trace: Perf | undefined;
          if (typeof condition.else.name === 'string') {
            trace = Performance.trace(`step-${condition.else.name}`, { detail: { file: args.path } });
          }
          result = await condition.else(result.code, args, context);
          trace?.stop();
        }
        // If no else branch, continue to next step
      }
    }

    return after(result.code, args, context);
  }
}
