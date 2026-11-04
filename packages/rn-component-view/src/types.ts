/**
 * How an `RNComponentView` sizes its content.
 * - `contentHeight`: the view sets the width and the content sets the height.
 * - `contentSize`: the content sets both the width and the height.
 * - `constrained`: the view sets both, and the content fills it.
 */
export type RNComponentViewSizing = 'contentHeight' | 'contentSize' | 'constrained';

/** A component registered with `AppRegistry.registerComponent` that an `RNComponentView` shows through a Portal. */
export interface RNComponentSessionState {
  /** The Portal host name of the native view. */
  readonly sessionId: string;
  readonly componentName: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly sizing: RNComponentViewSizing;
  /** A bundle that registers the component, evaluated once before the component renders. */
  readonly bundleFilePath?: string;
}

export type RNComponentEvent =
  | {
      readonly name: 'openComponent';
      readonly params: RNComponentSessionState;
    }
  | {
      readonly name: 'updateComponentProps';
      readonly params: {
        readonly sessionId: string;
        readonly props: Readonly<Record<string, unknown>>;
      };
    }
  | {
      readonly name: 'closeComponent';
      readonly params: { readonly sessionId: string };
    };

export interface RNComponentContentSize {
  readonly width: number;
  readonly height: number;
}

export interface RNComponentSessionSubscription {
  readonly remove: () => void;
}
