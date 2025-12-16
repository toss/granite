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


  return {
    name: 'radon-injector-plugin',
    visitor: {
      Program: {
        enter(programPath, state) {
          if (isTransforming('@granite-js/react-native')) {
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
