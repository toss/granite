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

export type CloseSessionRequest = Readonly<{
  sessionId: string;
}>;

export interface Spec extends TurboModule {
  evaluateScript(request: EvaluateScriptRequest): Promise<void>;
  requestCloseSession(request: CloseSessionRequest): Promise<void>;
  startEventDelivery(): void;
  readonly onEvent: CodegenTypes.EventEmitter<NativeMicroFrontendRuntimeEvent>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('GraniteMicroFrontendRuntime');
