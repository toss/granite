import { Linking } from 'react-native';

/**
 * @public
 * @kind function
 * @category Screen Navigation
 *
 * @name openURL
 * @signature
 * ```typescript
 * function openURL(url: string): Promise<any>;
 * ```
 *
 * @description
 * Opens the specified URL in the device's default browser or related app.
 * This function uses the [`Linking.openURL`](https://reactnative.dev/docs/0.72/linking#openurl) method from `react-native` to open the URL.
 *
 * @param {string} url URL address to open
 * @returns {Promise<any>} Promise that resolves when the URL is successfully opened
 *
 * @example
 *
 * ### Open external URL
 *
 * ```tsx
 * import { openURL } from '@granite-js/react-native';
 * import { Button } from 'react-native';
 *
 * function Page() {
 *   const handlePress = () => {
 *     openURL('https://google.com');
 *   };
 *
 *   return <Button title="Open Google Website" onPress={handlePress} />;
 * }
 * ```
 */
export function openURL(url: string): Promise<any> {
  return Linking.openURL(url);
}
