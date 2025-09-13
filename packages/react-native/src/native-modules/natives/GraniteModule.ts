import { TurboModule, TurboModuleRegistry } from 'react-native';

interface GraniteModuleSpec extends TurboModule {
  closeView: () => void;
  schemeUri: string;
}

export const GraniteModule = TurboModuleRegistry.get<GraniteModuleSpec>('GraniteModule');
if (!GraniteModule) {
  console.warn('[GraniteModule] is not registered');
}
