import { type CodegenTypes, type TurboModule, TurboModuleRegistry } from 'react-native';

export interface NativeRNComponentEventParams {
  readonly sessionId: string;
  readonly componentName?: string;
  readonly props?: CodegenTypes.UnsafeObject;
  readonly sizing?: string;
  readonly bundleFilePath?: string;
}

export interface NativeRNComponentEvent {
  readonly name: string;
  readonly params: NativeRNComponentEventParams;
}

export type ReportContentSizeRequest = Readonly<{
  sessionId: string;
  width: number;
  height: number;
}>;

export interface Spec extends TurboModule {
  /** Sends every open component, then each change as it happens, through `onEvent`. */
  startEventDelivery(): void;
  reportContentSize(request: ReportContentSizeRequest): void;
  readonly onEvent: CodegenTypes.EventEmitter<NativeRNComponentEvent>;
}

let nativeModule: Spec | null | undefined;

/**
 * The native module, or `null` when the app does not include it. It is looked up on first use, so evaluating the
 * package does not require it.
 */
export function getNativeGraniteRNComponentSessions(): Spec | null {
  if (nativeModule === undefined) {
    nativeModule = TurboModuleRegistry.get<Spec>('GraniteRNComponentSessions');
  }
  return nativeModule;
}
