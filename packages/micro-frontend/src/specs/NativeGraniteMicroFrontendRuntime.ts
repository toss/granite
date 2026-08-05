import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

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

export interface Spec extends TurboModule {
  evaluateScript(filePath: string): Promise<void>;
  requestCloseSession(sessionId: string): Promise<void>;
  startEventDelivery(): void;
  readonly onEvent: CodegenTypes.EventEmitter<NativeMicroFrontendRuntimeEvent>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('GraniteMicroFrontendRuntime');
