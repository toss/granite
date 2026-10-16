import { forwardRef, useState } from 'react';
import { UIManager, View, StyleSheet, type ViewProps } from 'react-native';
import { useMicroFrontendSession } from '../session/MicroFrontendSessionContext';
import NativeInitialContentView from '../specs/GranitePortalInitialContentViewNativeComponent';

export type PortalInitialContentViewProps = Omit<ViewProps, 'collapsable'>;

export const PortalInitialContentView = forwardRef<View, PortalInitialContentViewProps>(
  function PortalInitialContentView(props, ref) {
    const [hasNativeView] = useState(() => UIManager.hasViewManagerConfig('GranitePortalInitialContentView'));
    const { children, id, nativeID, collapsable: _collapsable, ...viewProps } = props as ViewProps;
    // Match View's id alias without using either identifier for mount observation.
    const identifierProps = id !== undefined ? { nativeID: id } : nativeID !== undefined ? { nativeID } : {};

    // Older native hosts can render the content, but cannot acknowledge its Fabric mount.
    if (!hasNativeView) {
      return (
        <View {...viewProps} {...identifierProps} ref={ref} collapsable={false}>
          {children}
        </View>
      );
    }

    return (
      <SessionInitialContentView {...viewProps} {...identifierProps} ref={ref}>
        {children}
      </SessionInitialContentView>
    );
  }
);

const SessionInitialContentView = forwardRef<View, PortalInitialContentViewProps>(function SessionInitialContentView(
  { children, ...viewProps },
  ref
) {
  const { sessionId } = useMicroFrontendSession();

  return (
    <NativeInitialContentView
      {...viewProps}
      ref={ref}
      initialContentKey={sessionId}
      initialContentRevision={0}
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
});

// A guaranteed Fabric child insertion identifies the marker's initial transaction even when
// the marker was preallocated. It contributes no layout, touch, or accessibility content.
const styles = StyleSheet.create({
  mountSentinel: { position: 'absolute', width: 0, height: 0 },
});
