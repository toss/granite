import { getExecutionContext } from './context';
import { getExecutionSessions } from './sessions';

export { asyncToGenerator } from './asyncToGenerator';

export { AsyncGeneratorYield, wrapAsyncGenerator } from './asyncGenerator';

export { executionScheduler, executionMethod, executionInvoke, executionSchedule, executionGlobals } from './callbackBoundaries';

export { runWithFiber, bindFiberListener, bindEffect, attachRef, detachRef, bindCallback, runWithInstance, registerRenderer } from './renderer';

export function initializeExecution(): void {
  getExecutionSessions();
  getExecutionContext();
}
