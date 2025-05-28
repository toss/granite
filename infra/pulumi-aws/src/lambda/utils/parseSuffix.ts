import { InvalidRequest } from '@granite-js/deployment-manager';

/** Extracts suffix from uri.
 *
 * @example
 *
 * '/ios/appName/0/0_72_6' => '0_72_6'
 * '/android/appName/0/0_72_6-reav3' => '0_72_6-reav3'
 */
export function parseSuffix(uri: string) {
  const [, , , , tag] = uri.split('/');

  if (tag == null || tag?.length === 0) {
    throw new InvalidRequest(`unable to parse suffix: ${uri}`);
  }

  return tag;
}
