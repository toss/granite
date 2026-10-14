import { createContext, forwardRef, useContext, type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

export interface PortalInitialContentRequest {
  readonly requestKey: string;
  readonly revision: number;
}

export interface PortalInitialContentProviderProps {
  readonly request?: PortalInitialContentRequest;
  readonly children: ReactNode;
}

export type PortalInitialContentViewProps = Omit<ViewProps, 'nativeID' | 'collapsable'>;

const PortalInitialContentContext = createContext<string | undefined>(undefined);

export function PortalInitialContentProvider({ request, children }: PortalInitialContentProviderProps) {
  let nativeID: string | undefined;
  if (request != null) {
    const { requestKey, revision } = request;
    if (typeof requestKey !== 'string' || requestKey.length === 0) {
      throw new Error('PortalInitialContentProvider requires a nonempty requestKey');
    }
    if (!Number.isInteger(revision) || revision < 0 || revision > 2147483647) {
      throw new Error('PortalInitialContentProvider requires revision to be an integer between 0 and 2147483647');
    }
    nativeID = `granite:portal-initial-content:${revision}:${requestKey}`;
  }

  return <PortalInitialContentContext.Provider value={nativeID}>{children}</PortalInitialContentContext.Provider>;
}

export const PortalInitialContentView = forwardRef<View, PortalInitialContentViewProps>(
  function PortalInitialContentView(props, ref) {
    const nativeID = useContext(PortalInitialContentContext);
    return <View {...props} ref={ref} nativeID={nativeID} collapsable={nativeID == null ? undefined : false} />;
  }
);
