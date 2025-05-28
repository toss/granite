export type CdpRequestId = number;

/**
 * https://github.com/ChromeDevTools/devtools-protocol/blob/master/types/protocol.d.ts
 */
export type SetBreakpointByUrlRequest = {
  id: CdpRequestId;
  method: 'Debugger.setBreakpointByUrl';
  params: {
    lineNumber: number;
    url?: string;
    urlRegex?: string;
    scriptHash?: string;
    columnNumber?: number;
    condition?: string;
  };
};

export type GetScriptSourceRequest = {
  id: CdpRequestId;
  method: 'Debugger.getScriptSource';
  params: {
    scriptId: string;
  };
};

export type GetResponseBodyRequest = {
  id: CdpRequestId;
  method: 'Network.getResponseBody';
  params: {
    requestId: CdpRequestId;
  };
};

/**
 * @deprecated
 */
export interface LegacyNetworkResponseData {
  method: 'Bedrock.networkResponseData';
  params: {
    requestId: string;
    data: string;
    base64Encoded: boolean;
  };
}

/**
 * Granite 커스텀 이벤트
 */
export interface NetworkResponseData {
  method: 'Granite.networkResponseData';
  params: {
    requestId: string;
    data: string;
    base64Encoded: boolean;
  };
}

export type DebuggerRequest = SetBreakpointByUrlRequest | GetScriptSourceRequest | GetResponseBodyRequest;

export type CustomEvent = LegacyNetworkResponseData | NetworkResponseData;
