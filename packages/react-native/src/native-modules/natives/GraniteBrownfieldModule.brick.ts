import { BrickModule, BrickModuleSpec } from 'brick-module';
import { CodegenTypes } from 'react-native';

interface GraniteBrownfieldModuleSpec extends BrickModuleSpec {
  readonly moduleName: 'GraniteBrownfieldModule';

  readonly supportedEvents: ['visibilityChanged'];

  onVisibilityChanged: CodegenTypes.EventEmitter<boolean>;

  closeView(): Promise<void>;
  schemeUri: string;
}

export const GraniteModule = BrickModule.get<GraniteBrownfieldModuleSpec>('GraniteBrownfieldModule');
