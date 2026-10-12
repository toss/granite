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
  options: PortalInitialContentOptions
): PortalInitialContentProps {
  const { ready, requestKey, revision } = options;

  if (typeof requestKey !== 'string' || requestKey.length === 0) {
    throw new Error('getPortalInitialContentProps requires a nonempty requestKey');
  }
  if (!Number.isInteger(revision) || revision < 0 || revision > 2147483647) {
    throw new Error('getPortalInitialContentProps requires revision to be an integer between 0 and 2147483647');
  }
  if (typeof ready !== 'boolean') {
    throw new Error('getPortalInitialContentProps requires ready to be a boolean');
  }

  return {
    collapsable: false,
    nativeID: ready ? `granite:portal-initial-content:${revision}:${requestKey}` : undefined,
  };
}
