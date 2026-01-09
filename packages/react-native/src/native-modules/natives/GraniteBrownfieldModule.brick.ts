import { BrickModule, BrickModuleSpec } from 'brick-module';
import { CodegenTypes } from 'react-native';

interface GraniteBrownfieldModuleSpec extends BrickModuleSpec {
  readonly moduleName: 'GraniteBrownfieldModule';
  readonly onVisibilityChanged: CodegenTypes.EventEmitter<boolean>;

  getConstants(): {
    schemeUri: string;
  };

  closeView(): Promise<void>;
}

export const GraniteModule = BrickModule.get<GraniteBrownfieldModuleSpec>('GraniteBrownfieldModule');
