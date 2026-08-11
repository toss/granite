import { expectTypeOf } from 'vitest';
import type { PendingHostComponent, registerPendingHostComponentRoute, usePendingHostComponentController } from './host';

interface PublicHostExports {
  readonly PendingHostComponent: typeof PendingHostComponent;
  readonly registerPendingHostComponentRoute: typeof registerPendingHostComponentRoute;
  readonly usePendingHostComponentController: typeof usePendingHostComponentController;
}

expectTypeOf<typeof import('./index')>().toMatchTypeOf<PublicHostExports>();
