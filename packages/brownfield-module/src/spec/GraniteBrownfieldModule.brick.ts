import { BrickModule, type BrickModuleSpec } from 'brick-module';
import type { CodegenTypes } from 'react-native';

export interface GraniteBrownfieldModuleSpec extends BrickModuleSpec {
  readonly moduleName: 'GraniteBrownfieldModule';
  readonly onVisibilityChanged: CodegenTypes.EventEmitter<{ visible: boolean }>;

  getConstants(): {
    schemeUri: string;
  };

  closeView(): Promise<void>;
}

export const GraniteBrownfieldModule = BrickModule.get<GraniteBrownfieldModuleSpec>('GraniteBrownfieldModule');
