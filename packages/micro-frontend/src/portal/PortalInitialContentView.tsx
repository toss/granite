import { forwardRef } from 'react';
import type { View, ViewProps } from 'react-native';
import { useMicroFrontendSession } from '../session/MicroFrontendSessionContext';
import NativeInitialContentView from '../specs/GranitePortalInitialContentViewNativeComponent';

export type PortalInitialContentViewProps = Omit<ViewProps, 'id' | 'nativeID' | 'collapsable'>;

export const PortalInitialContentView = forwardRef<View, PortalInitialContentViewProps>(
  function PortalInitialContentView(props, ref) {
    const { sessionId } = useMicroFrontendSession();
    const { id: _id, nativeID: _nativeID, collapsable: _collapsable, ...viewProps } = props as ViewProps;

    return (
      <NativeInitialContentView
        {...viewProps}
        ref={ref}
        nativeID={`granite:portal-initial-content:0:${sessionId}`}
        collapsable={false}
      />
    );
  }
);
