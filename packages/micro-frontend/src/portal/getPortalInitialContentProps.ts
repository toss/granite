export interface PortalInitialContentOptions {
  requestKey: string;
  revision: number;
  ready: boolean;
}

export interface PortalInitialContentProps {
  collapsable: false;
  nativeID: string | undefined;
}

export function getPortalInitialContentProps(
  _options: PortalInitialContentOptions
): PortalInitialContentProps {
  return {
    collapsable: false,
    nativeID: undefined,
  };
}
