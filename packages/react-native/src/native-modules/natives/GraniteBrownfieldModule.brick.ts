import { BrickModule, BrickModuleSpec } from 'brick-module';
import { CodegenTypes } from 'react-native';

interface GraniteBrownfieldModuleSpec extends BrickModuleSpec {
  readonly moduleName: 'GraniteBrownfieldModule';

  getConstants(): {
    schemeUri: string;
  };

  onVisibilityChanged: CodegenTypes.EventEmitter<boolean>;

  closeView(): Promise<void>;
}

export const GraniteModule = BrickModule.get<GraniteBrownfieldModuleSpec>('GraniteBrownfieldModule');
