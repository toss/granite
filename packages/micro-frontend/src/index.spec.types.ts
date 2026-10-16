import { createElement, createRef } from 'react';
import type { View, ViewProps } from 'react-native';
import { expectTypeOf } from 'vitest';
import type {
  PendingHostComponent,
  registerPendingHostComponentRoute,
  usePendingHostComponentController,
} from './host';
import {
  hidePendingHostComponent,
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
createElement(PortalInitialContentView);

// Preserve callback usages that predate the optional session ID.
const pendingCallbacks: ViewProps = { onLayout: hidePendingHostComponent };
createElement(PortalInitialContentView, pendingCallbacks);
void Promise.resolve({ ready: true }).then(hidePendingHostComponent);
hidePendingHostComponent('session-1');

// @ts-expect-error Initial content observation does not select routes or pending UI.
createElement(PortalInitialContentView, { url: 'granite://host/example/product' });
// @ts-expect-error Readiness is observed from native layout, not a caller-provided flag.
createElement(PortalInitialContentView, { ready: true });

createElement(PortalInitialContentView, { id: 'custom-alias' });
createElement(PortalInitialContentView, { nativeID: 'custom-marker' });
// @ts-expect-error Session identity remains internal to the component.
createElement(PortalInitialContentView, { initialContentKey: 'custom-session' });
// @ts-expect-error Observation revision remains internal to the component.
createElement(PortalInitialContentView, { initialContentRevision: 1 });
// @ts-expect-error The boundary must remain in the native hierarchy.
createElement(PortalInitialContentView, { collapsable: true });
