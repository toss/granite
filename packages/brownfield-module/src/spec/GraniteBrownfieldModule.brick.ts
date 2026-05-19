import { BrickModule, type BrickModuleSpec } from 'brick-module';
import type { CodegenTypes } from 'react-native';

export interface GraniteBrownfieldModuleSpec extends BrickModuleSpec {
  readonly moduleName: 'GraniteBrownfieldModule';
  readonly onVisibilityChanged: CodegenTypes.EventEmitter<{ visible: boolean }>;

  getConstants(): {
    /**
     * @deprecated Use `getSchemeUri()` instead. This will be removed in a future release.
     */
    schemeUri: string;
  };

  getSchemeUri(): string;

  closeView(): Promise<void>;
}

export const GraniteBrownfieldModule = BrickModule.get<GraniteBrownfieldModuleSpec>('GraniteBrownfieldModule');
