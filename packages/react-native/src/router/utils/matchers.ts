/** `[page]` -> `page` */
export function matchDynamicName(name: string): string | undefined {
  // eslint-disable-next-line no-useless-escape
  return name.match(/^\[([^[\](?:\.\.\.)]+?)\]$/)?.[1];
}
