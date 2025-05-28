import { TurboModule, TurboModuleRegistry } from 'react-native';

interface GraniteCoreModule extends TurboModule {
  addListener: (eventType: string) => void;
  removeListeners: (count: number) => void;
  importLazy: () => Promise<void>;
}

export const GraniteCoreModule = TurboModuleRegistry.getEnforcing<GraniteCoreModule>('GraniteCoreModule');
