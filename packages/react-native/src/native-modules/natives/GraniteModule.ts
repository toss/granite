import { TurboModule, TurboModuleRegistry } from 'react-native';

interface GraniteModuleSpec extends TurboModule {
  closeView: () => void;
  schemeUri: string;
}

export const GraniteModule = TurboModuleRegistry.getEnforcing<GraniteModuleSpec>('GraniteModule');
