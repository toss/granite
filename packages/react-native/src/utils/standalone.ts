import { BackHandler, Platform } from 'react-native';

/**
 * Returns whether the app was built as a standalone (greenfield) app via
 * `standalone: true` in `granite.config.ts`. Standalone apps run without a
 * brownfield host, so host-provided native APIs are unavailable.
 */
export function isStandaloneApp(): boolean {
  return globalThis.__granite?.app?.standalone === true;
}

/**
 * Guards brownfield-only APIs. Standalone (greenfield) apps have no brownfield
 * host to serve these calls, so we fail fast with a descriptive error instead
 * of reaching for a native module that does not exist.
 */
export function assertBrownfieldApi(apiName: string): void {
  if (isStandaloneApp()) {
    throw new Error(
      `'${apiName}' is not available in standalone (greenfield) apps. ` +
        'This API requires a brownfield host. Remove `standalone: true` from granite.config.ts if this app runs inside a host app.'
    );
  }
}

/**
 * Back action for standalone apps when the navigation stack is empty.
 * There is no brownfield host view to close, so follow platform conventions:
 * Android exits the app, iOS does nothing (apps cannot exit programmatically).
 */
export function exitStandaloneApp(): void {
  if (Platform.OS === 'android') {
    BackHandler.exitApp();
  }
}
