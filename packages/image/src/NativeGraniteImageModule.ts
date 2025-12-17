import { type TurboModule, TurboModuleRegistry } from 'react-native';

export interface ImageSource {
  uri: string;
  headers?: { [key: string]: string };
  priority?: string;
  cache?: string;
}

export interface Spec extends TurboModule {
  preload(sources: string): Promise<void>; // JSON string of ImageSource[]
  clearMemoryCache(): Promise<void>;
  clearDiskCache(): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('GraniteImageModule');
