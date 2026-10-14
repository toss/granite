import { forwardRef, Suspense, type ForwardedRef } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useIsPendingHostComponentHidden, useResolvedPendingHostComponent } from '../host/PendingHostComponent';
import { useMicroFrontendSession } from '../session/MicroFrontendSessionContext';

export type PortalInitialContentViewProps = Omit<ViewProps, 'id' | 'nativeID' | 'collapsable'> & {
  readonly url?: string | null;
};

export const PortalInitialContentView = forwardRef<View, PortalInitialContentViewProps>(
  function PortalInitialContentView(props, ref) {
    const { sessionId } = useMicroFrontendSession();
    const {
      url,
      id: _id,
      nativeID: _nativeID,
      collapsable: _collapsable,
      ...viewProps
    } = props as ViewProps & {
      url?: string | null;
    };
    const nativeID = `granite:portal-initial-content:0:${sessionId}`;

    if (url === undefined) {
      return <View {...viewProps} ref={ref} nativeID={nativeID} collapsable={false} />;
    }

    return <CoordinatedInitialContent url={url} nativeID={nativeID} viewProps={viewProps} viewRef={ref} />;
  }
);

function CoordinatedInitialContent({
  url,
  nativeID,
  viewProps: { children, ...viewProps },
  viewRef,
}: {
  url: string | null;
  nativeID: string;
  viewProps: ViewProps;
  viewRef: ForwardedRef<View>;
}) {
  const pending = useResolvedPendingHostComponent(url);
  const isPendingHidden = useIsPendingHostComponentHidden();
  const PendingComponent = pending?.component;
  const showPending = pending != null && !isPendingHidden;

  return (
    <View {...viewProps} ref={viewRef} collapsable={false}>
      <Suspense fallback={null}>
        <View
          nativeID={showPending ? undefined : nativeID}
          collapsable={false}
          accessibilityElementsHidden={showPending ? true : undefined}
          importantForAccessibility={showPending ? 'no-hide-descendants' : undefined}
          pointerEvents={showPending ? 'none' : undefined}
          style={[styles.primary, showPending && styles.hiddenPrimary]}
        >
          {children}
        </View>
      </Suspense>
      {showPending && PendingComponent != null ? (
        <View
          nativeID={nativeID}
          collapsable={false}
          accessibilityElementsHidden={true}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={StyleSheet.absoluteFillObject}
        >
          <PendingComponent {...pending.params} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  primary: { flex: 1 },
  hiddenPrimary: { opacity: 0 },
});
