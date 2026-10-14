import { forwardRef } from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { useMicroFrontendSession } from '../session/MicroFrontendSessionContext';
import NativeInitialContentView from '../specs/GranitePortalInitialContentViewNativeComponent';

export type PortalInitialContentViewProps = Omit<ViewProps, 'id' | 'nativeID' | 'collapsable'>;

export const PortalInitialContentView = forwardRef<View, PortalInitialContentViewProps>(
  function PortalInitialContentView(props, ref) {
    const { sessionId } = useMicroFrontendSession();
    const { children, id: _id, nativeID: _nativeID, collapsable: _collapsable, ...viewProps } = props as ViewProps;

    return (
      <NativeInitialContentView
        {...viewProps}
        ref={ref}
        nativeID={`granite:portal-initial-content:0:${sessionId}`}
        collapsable={false}
      >
        <View
          nativeID="granite:portal-mount-sentinel"
          collapsable={false}
          pointerEvents="none"
          accessibilityElementsHidden={true}
          importantForAccessibility="no-hide-descendants"
          style={styles.mountSentinel}
        />
        {children}
      </NativeInitialContentView>
    );
  }
);

// A guaranteed Fabric child insertion identifies the marker's initial transaction even when
// the marker was preallocated. It contributes no layout, touch, or accessibility content.
const styles = StyleSheet.create({
  mountSentinel: { position: 'absolute', width: 0, height: 0 },
});
