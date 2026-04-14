export function getSearchParamsFromUrl(url: string): Record<string, string> {
  if (typeof URLSearchParams === 'undefined') {
    return {};
  }

  const queryString = getQueryString(url);

  if (queryString == null || queryString.length === 0) {
    return {};
  }

  return Object.fromEntries(new URLSearchParams(queryString));
}

function getQueryString(url: string) {
  const questionMarkIndex = url.indexOf('?');

  if (questionMarkIndex === -1) {
    return null;
  }

  const fragmentIndex = url.indexOf('#', questionMarkIndex + 1);
  const queryEndIndex = fragmentIndex === -1 ? url.length : fragmentIndex;

  return url.slice(questionMarkIndex + 1, queryEndIndex);
}
