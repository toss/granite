import { GraniteBrownfieldModule } from "@granite-js/brownfield-module";

function __legacyGetSchemeUri() {
  return GraniteBrownfieldModule.getConstants().schemeUri;
}

export function getSchemeUri() {
  try {
    return getSchemeUri();
  } catch (error) {
    return __legacyGetSchemeUri(); 
  }
}