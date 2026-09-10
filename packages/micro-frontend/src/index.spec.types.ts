import { expectTypeOf } from 'vitest';
import type {
  PendingHostComponent,
  registerPendingHostComponentRoute,
  usePendingHostComponentController,
} from './host';
import type { MicroFrontendRuntimeApi, MicroFrontendSessionState } from './index';

interface PublicHostExports {
  readonly PendingHostComponent: typeof PendingHostComponent;
  readonly registerPendingHostComponentRoute: typeof registerPendingHostComponentRoute;
  readonly usePendingHostComponentController: typeof usePendingHostComponentController;
}

expectTypeOf<typeof import('./index')>().toMatchTypeOf<PublicHostExports>();
expectTypeOf<MicroFrontendRuntimeApi['getSessions']>().returns.toEqualTypeOf<readonly MicroFrontendSessionState[]>();
expectTypeOf<MicroFrontendRuntimeApi['onSessionsChanged']>()
  .parameter(0)
  .toEqualTypeOf<(sessions: readonly MicroFrontendSessionState[]) => void>();
