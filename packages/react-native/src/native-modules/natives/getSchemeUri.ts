import { GraniteBrownfieldModule } from "@granite-js/brownfield-module";

export function getSchemeUri() {
  try {
    return GraniteBrownfieldModule.getSchemeUri();
  } catch {
    // Fallback to the deprecated `schemeUri` constant for older versions of the native module
    return GraniteBrownfieldModule.getConstants().schemeUri;
  }
}