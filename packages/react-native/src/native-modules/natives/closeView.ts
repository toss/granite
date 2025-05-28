import { GraniteModule } from './GraniteModule';

/**
 * @public
 * @category Screen Control
 * @kind function
 * @name closeView
 * @description Function that closes the current screen. It can be used when you want to exit a service by pressing a "Close" button.
 * @returns {Promise<void>}
 *
 * @example
 * ### Close screen with close button
 *
 * ```tsx
 * import { Button } from 'react-native';
 * import { closeView } from '@granite-js/react-native';
 *
 * function CloseButton() {
 *  return <Button title="Close" onPress={closeView} />;
 * }
 * ```
 */
export async function closeView() {
  return GraniteModule.closeView();
}
