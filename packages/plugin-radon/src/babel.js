const fs = require('fs');
const path = require('path');

module.exports = function(api) {
  api.assertVersion(7);

  const { parse } = api;

  const appRoot = process.cwd();

  const requireFromAppDir = (module) => {
    const resolvedPath = require.resolve(module, { paths: [appRoot] });
    return require(resolvedPath);
  };

  // --- Helper Functions ---
  
  const createRequirePath = (moduleName) => `'__RNIDE_lib__/${moduleName}'`;

  const injectCode = (programPath, code, prepend = false) => {
    const ast = parse(code, { sourceType: 'module', filename: 'radon.injection.js', parserOpts: { allowReturnOutsideFunction: true } });
    if (prepend) {
      programPath.unshiftContainer('body', ast.program.body);
    } else {
      programPath.pushContainer('body', ast.program.body);
    }
  };

  const replaceModuleWith = (programPath, code) => {
    const ast = parse(code, { sourceType: 'module', filename: 'radon.injection.js', parserOpts: { allowReturnOutsideFunction: true } });
    programPath.get('body').forEach(p => p.remove());
    programPath.pushContainer('body', ast.program.body);
  };

  return {
    name: 'radon-injector-plugin',
    visitor: {
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
          
          // This MUST be the first check.
          if (isTransforming("react-native/Libraries/Core/InitializeCore.js")) {
            console.log(`🔥 RADON BABEL PLUGIN: ✅ INJECTING BUNDLED RUNTIME AT THE END of InitializeCore.js`);
            try {
              const pluginPackageJsonPath = require.resolve('@granite-js/plugin-radon/package.json', { paths: [appRoot] });
              const pluginRoot = path.dirname(pluginPackageJsonPath);
              const runtimePath = path.join(pluginRoot, 'dist', 'lib', 'runtime.cjs');
              
              const runtimeCode = fs.readFileSync(runtimePath, 'utf8');

              const devtoolsPort = process.env.RCT_DEVTOOLS_PORT;
              console.log(`🔥 RADON BABEL PLUGIN: Reading process.env.RCT_DEVTOOLS_PORT. Value is: [${devtoolsPort}]`);

              const portInjectionCode = devtoolsPort ? `globalThis.__REACT_DEVTOOLS_PORT__ = ${devtoolsPort};` : '';

              const finalCodeToInject = `${portInjectionCode}\n${runtimeCode}`;

              // By appending the code to the end of the file and wrapping in setImmediate,
              // we ensure all polyfills are ready before our code runs.
              const finalSafeCode = `setImmediate(() => { try { \n${finalCodeToInject}\n } catch (e) { console.error('Radon runtime error:', e); } });`;

              injectCode(programPath, finalSafeCode, false); // Append to the end
              
              state.file.metadata.radonInjected = true;
              console.log(`🔥 RADON BABEL PLUGIN: ✅ INJECTION COMPLETED`);
            } catch (e) {
              console.error('🔥 RADON BABEL PLUGIN: 🚨 FAILED TO READ RUNTIME BUNDLE.', e);
              throw e;
            }
            // Once handled, we are done with this file.
            return;
          }

          // --- Other file transformations ---
          if (isTransforming("expo-router/entry.js")) {
            const { version } = requireFromAppDir("expo-router/package.json");
            if (version.startsWith("2.")) {
              injectCode(programPath, `require(${createRequirePath('expo_router_v2_plugin.js')});`);
            } else if (version.startsWith("3.") || version.startsWith("4.")) {
              injectCode(programPath, `require(${createRequirePath('expo_router_plugin.js')});`);
            } else if (version.startsWith("5.")) {
              injectCode(programPath, `require(${createRequirePath('expo_router_v5_plugin.js')});`);
            }
            injected = true;
          } else if (isTransforming("react-native-ide/index.js") || isTransforming("radon-ide/index.js")) {
            injectCode(programPath, `preview = require(${createRequirePath('preview.js')}).preview;`);
            injected = true;
          } else if (isTransforming("@dev-plugins/react-native-mmkv/build/index.js")) {
            injectCode(programPath, `require(${createRequirePath('expo_dev_plugins.js')}).register("@dev-plugins/react-native-mmkv");`, true);
            injected = true;
          } else if (isTransforming("redux-devtools-expo-dev-plugin/build/index.js")) {
            injectCode(programPath, `require(${createRequirePath('expo_dev_plugins.js')}).register("redux-devtools-expo-dev-plugin");`, true);
            injected = true;
          } else if (isTransforming("react-native/Libraries/Renderer/implementations/ReactFabric-dev.js") || isTransforming("react-native/Libraries/Renderer/implementations/ReactNativeRenderer-dev.js")) {
            const { version } = requireFromAppDir("react-native/package.json");
            const rendererFileName = path.basename(filename);
            let replacementPath;
            if (version.startsWith("0.74") || version.startsWith("0.75") || version.startsWith("0.76") || version.startsWith("0.77")) {
              replacementPath = createRequirePath(`rn-renderer/react-native-74-77/${rendererFileName}`);
            } else if (version.startsWith("0.78") || version.startsWith("0.79")) {
              replacementPath = createRequirePath(`rn-renderer/react-native-78-79/${rendererFileName}`);
            } else if (version.startsWith("0.80")) {
              replacementPath = createRequirePath(`rn-renderer/react-native-80/${rendererFileName}`);
            }
            if (replacementPath) {
              replaceModuleWith(programPath, `module.exports = require(${replacementPath});`);
              injected = true;
            }
          } else if (isTransforming("react/cjs/react-jsx-dev-runtime.development.js")) {
            const { version } = requireFromAppDir("react-native/package.json");
            const jsxRuntimeFileName = path.basename(filename);
            let replacementPath;
            if (version.startsWith("0.78") || version.startsWith("0.79")) {
                replacementPath = createRequirePath(`JSXRuntime/react-native-78-79/${jsxRuntimeFileName}`);
            } else if (version.startsWith("0.80")) {
                replacementPath = createRequirePath(`JSXRuntime/react-native-80/${jsxRuntimeFileName}`);
            }
            if (replacementPath) {
              replaceModuleWith(programPath, `module.exports = require(${replacementPath});`);
              injected = true;
            }
          } else if (isTransforming("@tanstack/react-query/src/index.ts") || isTransforming("@tanstack/react-query/build/lib/index.js")) {
            injectCode(programPath, `require(${createRequirePath('plugins/react-query-devtools.js')});`, true);
            injected = true;
          } else if (isTransforming("/lib/rn-internals/rn-internals.js")) {
            const { version } = requireFromAppDir("react-native/package.json");
            const majorMinorVersion = version.split(".").slice(0, 2).join(".");
            const replacementPath = createRequirePath(`rn-internals/rn-internals-${majorMinorVersion}.js`);
            replaceModuleWith(programPath, `module.exports = require(${replacementPath});`);
            injected = true;
          }

          if (injected) {
            state.file.metadata.radonInjected = true;
          }
        }
      }
    }
  };
};
