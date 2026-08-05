export type AppRequest = `${string}/${string}`;

export interface MicroFrontendAdapter {
  readonly loadBundle: (appName: string) => Promise<string>;
}

export type MicroFrontendRuntimeEvent =
  | {
      readonly name: 'preloadApp';
      readonly params: { readonly appName: string };
    }
  | {
      readonly name: 'openApp';
      readonly params: {
        readonly sessionId: string;
        readonly appName: string;
        readonly scheme: string;
      };
    }
  | {
      readonly name: 'closeApp';
      readonly params: { readonly sessionId: string };
    }
  | {
      readonly name: 'sessionVisibilityChanged';
      readonly params: {
        readonly sessionId: string;
        readonly isVisible: boolean;
      };
    };

export interface MicroFrontendRuntimeEventSubscription {
  readonly remove: () => void;
}

export interface MicroFrontendRuntimeApi {
  readonly evaluateScript: (filePath: string) => Promise<void>;
  readonly preloadApp: (appName: string) => Promise<void>;
  readonly importApp: <TModule>(request: AppRequest) => Promise<TModule>;
  readonly closeSession: (sessionId: string) => Promise<void>;
  readonly onEvent: (listener: (event: MicroFrontendRuntimeEvent) => void) => MicroFrontendRuntimeEventSubscription;
}
