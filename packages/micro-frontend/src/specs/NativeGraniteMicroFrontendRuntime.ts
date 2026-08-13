import { type CodegenTypes, type TurboModule, TurboModuleRegistry } from 'react-native';

export interface NativeMicroFrontendRuntimeEventParams {
  readonly appName?: string;
  readonly sessionId?: string;
  readonly scheme?: string;
  readonly isVisible?: boolean;
}

export interface NativeMicroFrontendRuntimeEvent {
  readonly name: string;
  readonly params: NativeMicroFrontendRuntimeEventParams;
}

export type EvaluateScriptRequest = Readonly<{
  filePath: string;
}>;

export interface Spec extends TurboModule {
  evaluateScript(request: EvaluateScriptRequest): Promise<void>;
  startEventDelivery(): void;
  readonly onEvent: CodegenTypes.EventEmitter<NativeMicroFrontendRuntimeEvent>;
}

let nativeModule: Spec | null = null;

function getNativeModule() {
  nativeModule ??= TurboModuleRegistry.getEnforcing<Spec>('GraniteMicroFrontendRuntime');
  return nativeModule;
}

const NativeGraniteMicroFrontendRuntime: Spec = {
  evaluateScript(request) {
    return getNativeModule().evaluateScript(request);
  },
  startEventDelivery() {
    getNativeModule().startEventDelivery();
  },
  onEvent(listener) {
    return getNativeModule().onEvent(listener);
  },
};

export default NativeGraniteMicroFrontendRuntime;
