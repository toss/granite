import { createElement, createRef } from 'react';
import type { View } from 'react-native';
import { expectTypeOf } from 'vitest';
import type {
  PendingHostComponent,
  registerPendingHostComponentRoute,
  usePendingHostComponentController,
} from './host';
import {
  PortalInitialContentView,
  type MicroFrontendRuntimeApi,
  type MicroFrontendSessionState,
  type PortalInitialContentViewProps,
} from './index';

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

const contentViewProps: PortalInitialContentViewProps = {
  style: { flex: 1 },
  accessibilityLabel: 'initial content',
  pointerEvents: 'none',
  onLayout: () => undefined,
};
createElement(PortalInitialContentView, { ...contentViewProps, ref: createRef<View>() });

// @ts-expect-error View identifiers are reserved for the session marker.
createElement(PortalInitialContentView, { id: 'custom-alias' });
// @ts-expect-error The native marker cannot be supplied by the caller.
createElement(PortalInitialContentView, { nativeID: 'custom-marker' });
// @ts-expect-error The boundary must remain in the native hierarchy.
createElement(PortalInitialContentView, { collapsable: true });
