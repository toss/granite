const fs = require('fs');
const path = require('path');
const { getPackageRoot } = require('@granite-js/utils');
const { createJSXSourceVisitor } = require('./jsx-source-visitor');
const { injectGraniteGlobals } = require('./lib/granite_router/global_injector');
const { processPageFile } = require('./lib/granite_router/navigation_injector');
const { parseRouterGenFile } = require('./lib/granite_router/router_parser');

module.exports = function (api, options = {}) {
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

  const requireFromAppDir = (module) => {
    const resolvedPath = require.resolve(module, { paths: [appRoot] });
    return require(resolvedPath);
  };

  // Function to generate paths for bundled renderer files
  const createRendererPath = (rendererFileName, version) => {
    try {
      const pluginPackageJsonPath = require.resolve('@granite-js/plugin-radon/package.json', { paths: [appRoot] });
      const pluginRoot = path.dirname(pluginPackageJsonPath);

      let versionFolder;
      if (version.startsWith('0.72')) {
        versionFolder = 'react-native-72';
      }

      if (versionFolder) {
        const rendererPath = path.join(
          pluginRoot,
          'dist',
          'lib',
          'rn-renderer',
          rendererFileName.replace('.js', '.cjs')
        );
        return rendererPath;
      }

      return null;
    } catch (e) {
      console.error('🔥 RADON BABEL PLUGIN: Failed to resolve renderer path:', e);
      return null;
    }
  };

  const injectCode = (programPath, code, prepend = false) => {
    const ast = parse(code, {
      sourceType: 'module',
      filename: 'radon.injection.js',
      parserOpts: { allowReturnOutsideFunction: true },
    });
    if (prepend) {
      programPath.unshiftContainer('body', ast.program.body);
    } else {
      programPath.pushContainer('body', ast.program.body);
    }
  };

  const replaceModuleWith = (programPath, code) => {
    const ast = parse(code, {
      sourceType: 'module',
      filename: 'radon.injection.js',
      parserOpts: { allowReturnOutsideFunction: true },
    });
    programPath.get('body').forEach((p) => p.remove());
    programPath.pushContainer('body', ast.program.body);
  };

  const jsxSourceVisitor = createJSXSourceVisitor(t);

  return {
    name: 'radon-injector-plugin',
    visitor: {
      ...jsxSourceVisitor,

      Program: {
        enter(programPath, state) {
          const filename = state.file.opts.filename;
          if (!filename || state.file.metadata.radonInjected) {
            return;
          }

          const isTransforming = (modulePath) => {
            try {
              const resolvedPath = require.resolve(modulePath, { paths: [appRoot] });
              return path.normalize(filename) === path.normalize(resolvedPath);
            } catch {
              return false;
            }
          };

          let injected = false;

          if (
            isTransforming('react-native/Libraries/Renderer/implementations/ReactFabric-dev.js') ||
            isTransforming('react-native/Libraries/Renderer/implementations/ReactNativeRenderer-dev.js')
          ) {
            const { version } = requireFromAppDir('react-native/package.json');
            const rendererFileName = path.basename(filename);

            const rendererPath = createRendererPath(rendererFileName, version);

            if (rendererPath && fs.existsSync(rendererPath)) {
              try {
                const rendererCode = fs.readFileSync(rendererPath, 'utf8');
                const fingerprint = `globalThis.__RADON_RENDERER_LOADED__ = '${path.basename(rendererPath)}';`;
                const finalRendererCode = `${fingerprint}\n${rendererCode}`;

                replaceModuleWith(programPath, finalRendererCode);
                injected = true;
              } catch (e) {
                console.error('🔥 RADON BABEL PLUGIN: 🚨 Failed to read custom renderer:', e);
              }
            } else {
              console.warn(`🔥 RADON BABEL PLUGIN: ⚠️ Custom renderer not found: ${rendererPath}`);
              if (version.startsWith('0.72')) {
                console.log(
                  `🔥 RADON BABEL PLUGIN: ⚠️ 0.72 version detected but no custom renderer found. This might be the issue!`
                );
              }
            }
          }

          if (injected) {
            state.file.metadata.radonInjected = true;
          }
          if (isTransforming('react-native/Libraries/Core/InitializeCore.js') && !options.disableRuntimeInjection) {
            try {
              const pluginPackageJsonPath = require.resolve('@granite-js/plugin-radon/package.json', {
                paths: [appRoot],
              });
              const pluginRoot = path.dirname(pluginPackageJsonPath);
              const runtimePath = path.join(pluginRoot, 'dist', 'lib', 'runtime.cjs');

              const runtimeCode = fs.readFileSync(runtimePath, 'utf8');

              const devtoolsPort = process.env.RCT_DEVTOOLS_PORT;

              const portInjectionCode = devtoolsPort ? `globalThis.__REACT_DEVTOOLS_PORT__ = ${devtoolsPort};` : '';

              const finalCodeToInject = `${portInjectionCode}\n${runtimeCode}`;

              const finalSafeCode = `setImmediate(() => { try { \n${finalCodeToInject}\n } catch (e) { console.error('Radon runtime error:', e); } });`;

              injectCode(programPath, finalSafeCode, false); // Append to the end

              state.file.metadata.radonInjected = true;
            } catch (e) {
              console.error('🔥 RADON BABEL PLUGIN: 🚨 FAILED TO READ RUNTIME BUNDLE.', e);
              throw e;
            }
            return;
          }

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
