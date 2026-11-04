/**
 * Stands in for `@granite-js/react-native`, which the library's route and
 * session helpers import and this example does not install. The example uses
 * neither `createRoute` nor `MicroFrontendSessionProvider`, so the stubs only
 * need to load.
 */
function unavailable(name) {
  return () => {
    throw new Error(`${name} is not available in the portal example`);
  };
}

module.exports = {
  createRoute: unavailable("createRoute"),
  useNavigation: unavailable("useNavigation"),
  VisibilityChangedProvider: ({ children }) => children,
};
