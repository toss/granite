import { BrickModule, BrickModuleSpec } from 'brick-module';

interface GraniteModuleSpec extends BrickModuleSpec {
  closeView: () => void;
  schemeUri: string;
}

export const GraniteModule = BrickModule.get<GraniteModuleSpec>('GraniteModule');
