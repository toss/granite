/**
 * Stands in for `@granite-js/react-native`, which the entry of `@granite-js/micro-frontend` imports for its route and
 * session helpers, and this example does not install. The example uses only the micro-frontend Portal, so the stubs
 * only need to load.
 */
function unavailable(name) {
  return () => {
    throw new Error(`${name} is not available in the RNComponentView example`);
  };
}

module.exports = {
  createRoute: unavailable('createRoute'),
  useNavigation: unavailable('useNavigation'),
  VisibilityChangedProvider: ({ children }) => children,
};
