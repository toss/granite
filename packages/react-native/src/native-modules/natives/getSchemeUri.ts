import { GraniteBrownfieldModule } from '@granite-js/brownfield-module';
import { assertBrownfieldApi } from '../../utils/standalone';

export function getSchemeUri() {
  assertBrownfieldApi('getSchemeUri');

  try {
    return GraniteBrownfieldModule.getSchemeUri();
  } catch {
    // Fallback to the deprecated `schemeUri` constant for older versions of the native module
    return GraniteBrownfieldModule.getConstants().schemeUri;
  }
}
