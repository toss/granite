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
  
  // 번들링된 렌더러 파일들의 경로를 생성하는 함수
  const createRendererPath = (rendererFileName, version) => {
    try {
      const pluginPackageJsonPath = require.resolve('@granite-js/plugin-radon/package.json', { paths: [appRoot] });
      const pluginRoot = path.dirname(pluginPackageJsonPath);
      
      let versionFolder;
      if (version.startsWith("0.72")) {
        versionFolder = "react-native-72";
      } else if (version.startsWith("0.74") || version.startsWith("0.75") || version.startsWith("0.76") || version.startsWith("0.77")) {
        versionFolder = "react-native-74-77";
      } else if (version.startsWith("0.78") || version.startsWith("0.79")) {
        versionFolder = "react-native-78-79";
      } else if (version.startsWith("0.80")) {
        versionFolder = "react-native-80";
      }
      
      if (versionFolder) {
        const rendererPath = path.join(pluginRoot, 'src', 'lib', 'rn-renderer', versionFolder, rendererFileName);
        console.log(`🔥 RADON BABEL PLUGIN: Constructed renderer path: ${rendererPath}`);
        return rendererPath;
      }
      
      console.log(`🔥 RADON BABEL PLUGIN: No version folder found for version: ${version}`);
      return null;
    } catch (e) {
      console.error('🔥 RADON BABEL PLUGIN: Failed to resolve renderer path:', e);
      return null;
    }
  };

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

          // --- React Native 렌더러 파일 교체 ---
          if (isTransforming("react-native/Libraries/Renderer/implementations/ReactFabric-dev.js") || 
              isTransforming("react-native/Libraries/Renderer/implementations/ReactNativeRenderer-dev.js")) {
            
            console.log(`🔥 RADON BABEL PLUGIN: Replacing React Native renderer: ${filename}`);
            
            const { version } = requireFromAppDir("react-native/package.json");
            const rendererFileName = path.basename(filename);
            
            console.log(`🔥 RADON BABEL PLUGIN: React Native version: ${version}, Renderer file: ${rendererFileName}`);
            
            const rendererPath = createRendererPath(rendererFileName, version);
            
            if (rendererPath && fs.existsSync(rendererPath)) {
              console.log(`🔥 RADON BABEL PLUGIN: ✅ Loading custom renderer from: ${rendererPath}`);
              
              try {
                const rendererCode = fs.readFileSync(rendererPath, 'utf8');
                // Add a fingerprint to verify the custom renderer is loaded.
                const fingerprint = `globalThis.__RADON_RENDERER_LOADED__ = '${path.basename(rendererPath)}';`;
                const finalRendererCode = `${fingerprint}\n${rendererCode}`;

                replaceModuleWith(programPath, finalRendererCode);
                injected = true;
                console.log(`🔥 RADON BABEL PLUGIN: ✅ Successfully replaced renderer`);
              } catch (e) {
                console.error('🔥 RADON BABEL PLUGIN: 🚨 Failed to read custom renderer:', e);
                // 실패 시 원본 파일 유지
              }
            } else {
              console.warn(`🔥 RADON BABEL PLUGIN: ⚠️ Custom renderer not found: ${rendererPath}`);
              if (version.startsWith("0.72")) {
                console.log(`🔥 RADON BABEL PLUGIN: ⚠️ 0.72 version detected but no custom renderer found. This might be the issue!`);
              }
            }
          }
          // --- JSX Runtime 파일 교체 ---
          else if (isTransforming("react/cjs/react-jsx-dev-runtime.development.js")) {
            const { version } = requireFromAppDir("react-native/package.json");
            const jsxRuntimeFileName = path.basename(filename);
            
            try {
              const pluginPackageJsonPath = require.resolve('@granite-js/plugin-radon/package.json', { paths: [appRoot] });
              const pluginRoot = path.dirname(pluginPackageJsonPath);
              
              let versionFolder;
              if (version.startsWith("0.78") || version.startsWith("0.79")) {
                versionFolder = "react-native-78-79";
              } else if (version.startsWith("0.80")) {
                versionFolder = "react-native-80";
              }
              
              if (versionFolder) {
                const jsxRuntimePath = path.join(pluginRoot, 'dist', 'lib', 'JSXRuntime', versionFolder, jsxRuntimeFileName);
                
                if (fs.existsSync(jsxRuntimePath)) {
                  const jsxRuntimeCode = fs.readFileSync(jsxRuntimePath, 'utf8');
                  replaceModuleWith(programPath, jsxRuntimeCode);
                  injected = true;
                  console.log(`🔥 RADON BABEL PLUGIN: ✅ Successfully replaced JSX runtime`);
                }
              }
            } catch (e) {
              console.error('🔥 RADON BABEL PLUGIN: 🚨 Failed to replace JSX runtime:', e);
            }
          }
          // --- React Query 플러그인 주입 ---
          else if (isTransforming("@tanstack/react-query/src/index.ts") || 
                   isTransforming("@tanstack/react-query/build/lib/index.js")) {
            
            try {
              const pluginPackageJsonPath = require.resolve('@granite-js/plugin-radon/package.json', { paths: [appRoot] });
              const pluginRoot = path.dirname(pluginPackageJsonPath);
              const reactQueryPluginPath = path.join(pluginRoot, 'dist', 'lib', 'plugins', 'react-query-devtools.cjs');
              
              if (fs.existsSync(reactQueryPluginPath)) {
                const reactQueryPluginCode = fs.readFileSync(reactQueryPluginPath, 'utf8');
                injectCode(programPath, reactQueryPluginCode, true);
                injected = true;
                console.log(`🔥 RADON BABEL PLUGIN: ✅ Successfully injected React Query plugin`);
              }
            } catch (e) {
              console.error('🔥 RADON BABEL PLUGIN: 🚨 Failed to inject React Query plugin:', e);
            }
          }
          // --- RN Internals 파일 교체 ---
          else if (isTransforming("/lib/rn-internals/rn-internals.js")) {
            const { version } = requireFromAppDir("react-native/package.json");
            const majorMinorVersion = version.split(".").slice(0, 2).join(".");
            
            try {
              const pluginPackageJsonPath = require.resolve('@granite-js/plugin-radon/package.json', { paths: [appRoot] });
              const pluginRoot = path.dirname(pluginPackageJsonPath);
              const rnInternalsPath = path.join(pluginRoot, 'dist', 'lib', 'rn-internals', `rn-internals-${majorMinorVersion}.cjs`);
              
              if (fs.existsSync(rnInternalsPath)) {
                const rnInternalsCode = fs.readFileSync(rnInternalsPath, 'utf8');
                replaceModuleWith(programPath, rnInternalsCode);
                injected = true;
                console.log(`🔥 RADON BABEL PLUGIN: ✅ Successfully replaced RN internals`);
              }
            } catch (e) {
              console.error('🔥 RADON BABEL PLUGIN: 🚨 Failed to replace RN internals:', e);
            }
          }

          if (injected) {
            state.file.metadata.radonInjected = true;
          }
        }
      }
    }
  };
};