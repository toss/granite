const fs = require('node:fs');
const path = require('node:path');
const { getPackageRoot } = require('@granite-js/utils');
const { injectGraniteGlobals } = require('./lib/granite_router/global_injector');
const { processPageFile } = require('./lib/granite_router/navigation_injector');
const { parseRouterGenFile } = require('./lib/granite_router/router_parser');

module.exports = (api) => {
  api.assertVersion(7);

  const { parse, types: t } = api;

  const appRoot = getPackageRoot();

  const scanGraniteRoutes = () => {
    try {
      const routerGenPath = path.join(appRoot, 'src', 'router.gen.ts');

      if (fs.existsSync(routerGenPath)) {
        return parseRouterGenFile(parse, routerGenPath);
      }
    } catch (error) {
      console.error('🔥 RADON BABEL PLUGIN: Route scanning failed:', error);
      return [
        {
          path: '/',
          filePath: './pages/index.tsx',
          type: 'route',
        },
      ];
    }
  };

  // Helper to check if we're transforming a file from a specific package
  const isTransforming = (packageName, filename) => {
    if (!filename) {
      return false;
    }
    // Check if filename includes the package name (could be in node_modules or package path)
    return filename.includes(packageName);
  };

  // Helper to inject code into the program
  const injectCode = (programPath, codeString, _prepend = false) => {
    try {
      const ast = parse(codeString, {
        sourceType: 'module',
        filename: 'injected-code.js',
      });
      if (_prepend) {
        programPath.unshiftContainer('body', ast.program.body);
      } else {
        programPath.pushContainer('body', ast.program.body);
      }
    } catch (error) {
      console.error('🔥 RADON BABEL PLUGIN: Failed to parse injected code:', error);
      throw error;
    }
  };

  return {
    name: 'radon-injector-plugin',
    visitor: {
      Program: {
        enter(programPath, state) {
          const filename = state.file.opts.filename || state.filename || '';

          if (isTransforming('@granite-js/react-native', filename)) {
            try {
              const scannedRoutes = scanGraniteRoutes();
              const injected = injectGraniteGlobals(injectCode, programPath, scannedRoutes);

              if (injected) {
                state.file.metadata.radonInjected = true;
              }
            } catch (e) {
              console.error('🔥 RADON BABEL PLUGIN: Failed to inject Granite detection code:', e);
            }
          }

          processPageFile(filename, programPath, parse, t, state);
        },
      },
    },
  };
};
