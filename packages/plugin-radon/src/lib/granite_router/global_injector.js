// Granite Router global variable injection utilities

/**
 * Generate code to inject Granite Router detection and routes into global scope
 * @param {Array} routes - Array of route objects from parseRouterGenFile
 * @returns {string} - Code string to inject
 */
const generateGraniteInjectionCode = (routes) => {
  const routesJson = JSON.stringify(routes, null, 2);
  
  return `
// Mark that Granite Router is being used
globalThis.__GRANITE_ROUTER_DETECTED__ = true;

// Inject auto-scanned routes
globalThis.__GRANITE_ROUTES = ${routesJson};
`;
};

/**
 * Inject Granite Router global variables into the program
 * @param {Function} injectCode - Babel inject function
 * @param {Object} programPath - Babel program path
 * @param {Array} routes - Array of route objects
 */
const injectGraniteGlobals = (injectCode, programPath, routes) => {
  try {
    const graniteDetectionCode = generateGraniteInjectionCode(routes);
    injectCode(programPath, graniteDetectionCode, false);
    return true;
  } catch (error) {
    console.error('🔥 RADON BABEL PLUGIN: Failed to inject Granite detection code:', error);
    return false;
  }
};

module.exports = {
  generateGraniteInjectionCode,
  injectGraniteGlobals
};