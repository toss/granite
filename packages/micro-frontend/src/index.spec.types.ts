import { expectTypeOf } from 'vitest';
import type { HostSkeleton, registerHostSkeletonRoute, useHostSkeletonController } from './host';

interface PublicHostExports {
  readonly HostSkeleton: typeof HostSkeleton;
  readonly registerHostSkeletonRoute: typeof registerHostSkeletonRoute;
  readonly useHostSkeletonController: typeof useHostSkeletonController;
}

expectTypeOf<typeof import('./index')>().toMatchTypeOf<PublicHostExports>();
