import { GraniteModule } from './GraniteModule';

/**
 * @public
 * @name getSchemeUri
 * @category Environment Check
 * @kind function
 * @description Returns the scheme value when first entering the screen. URI changes due to page navigation are not reflected.
 * @returns {string} Returns the scheme value when first entering the screen.
 *
 * @example
 * ### Get initial scheme value
 *
 * ```tsx
 * import { getSchemeUri } from '@granite-js/react-native';
 * import { Text } from 'react-native';
 *
 * function MyPage() {
 *  const schemeUri = getSchemeUri();
 *
 *  return <Text>Initial scheme value: {schemeUri}</Text>
 * }
 * ```
 */
export function getSchemeUri() {
  return GraniteModule.schemeUri;
}
