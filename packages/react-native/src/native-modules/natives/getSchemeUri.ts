import { GraniteBrownfieldModule } from '@granite-js/brownfield-module';

export function getSchemeUri() {
  try {
    const graniteBrownfieldModule = GraniteBrownfieldModule as typeof GraniteBrownfieldModule & {
      getSchemeUri?: () => string;
    };

    if (graniteBrownfieldModule.getSchemeUri != null) {
      return graniteBrownfieldModule.getSchemeUri();
    }
  } catch {
    // Fallback to the deprecated `schemeUri` constant for older versions of the native module
  }

  // Fallback to the deprecated `schemeUri` constant for older versions of the native module
  return GraniteBrownfieldModule.getConstants().schemeUri;
}
