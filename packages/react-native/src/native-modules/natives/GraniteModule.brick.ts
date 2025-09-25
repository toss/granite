import { BrickModule, BrickModuleSpec } from 'brick-module';

interface GraniteModuleSpec extends BrickModuleSpec {
  readonly moduleName: 'GraniteModule';

  readonly supportedEvents: ['visibilityChanged'];

  closeView(): Promise<void>;
  schemeUri: string;
}

export const GraniteModule = BrickModule.get<GraniteModuleSpec>('GraniteModule');
