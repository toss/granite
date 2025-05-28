/** Extracts groupId from uri.
 *
 * @example
 * '/ios/<appName>/groupId1/hbc' => 'groupId1'
 * '/ios/<appName>/groupId1' => 'groupId1'
 */
export function parseGroupId(uri: string): string | undefined {
  const [, , , groupId] = uri.split('/');

  return groupId;
}
