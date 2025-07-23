const fs = require('fs');
const path = require('path');
const createJSXSourceVisitor = require('./jsx-source-visitor');

module.exports = function(api, options = {}) {
  api.assertVersion(7);
  
  const { parse, types: t } = api;
  
  const appRoot = process.cwd();
  
  const scanGraniteRoutes = () => {
    try {
      const routerGenPath = path.join(appRoot, 'src', 'router.gen.ts');
      
      if (fs.existsSync(routerGenPath)) {
        return parseRouterGenFile(routerGenPath);
      }
      
    } catch (error) {
      console.error('🔥 RADON BABEL PLUGIN: Route scanning failed:', error);
      return [{
        path: "/",
        filePath: "./pages/index.tsx",
        type: "route"
      }];
    }
  };
  
  // Parse router.gen.ts file to extract route information
  const parseRouterGenFile = (routerGenPath) => {
    try {
      const content = fs.readFileSync(routerGenPath, 'utf8');
      const routes = [];
      
      const importRegex = /import\s+\{\s*Route\s+as\s+_(\w+)Route\s*\}\s+from\s+['"]\.\.\/pages\/([^'"]+)['"]/g;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        const componentName = match[1];
        const pagePath = match[2];
        const routePath = convertPagePathToRoute(pagePath);
        
        routes.push({
          path: routePath,
          filePath: `./pages/${pagePath}.tsx`,
          componentName: componentName,
          type: 'route'
        });
      }
      
      return routes;
    } catch (error) {
      console.error('🔥 RADON BABEL PLUGIN: Failed to parse router.gen.ts:', error);
      return [];
    }
  };
  
  // Convert page path to route path (Granite Router style)
  const convertPagePathToRoute = (pagePath) => {
    // index → /
    // about → /about  
    // user/profile → /user/profile
    // user/[id] → /user/:id
    
    let routePath = pagePath
      .replace(/\/index$/, '') // /index → empty string
      .replace(/\[([^\]]+)\]/g, ':$1'); // [id] → :id (dynamic route)
    
    // If empty string, use root path
    if (!routePath || routePath === '' || routePath === 'index') {
      routePath = '/';
    } else if (!routePath.startsWith('/')) {
      routePath = '/' + routePath;
    }
    
    return routePath;
  };

  const requireFromAppDir = (module) => {
    const resolvedPath = require.resolve(module, { paths: [appRoot] });
    return require(resolvedPath);
  };

  // --- Helper Functions ---
  
  // Function to generate paths for bundled renderer files
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
        const rendererPath = path.join(pluginRoot, 'dist', 'lib', 'rn-renderer', versionFolder, rendererFileName.replace('.js', '.cjs'));
        return rendererPath;
      }
      
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

  const jsxSourceVisitor = createJSXSourceVisitor(t);

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
          
          if (isTransforming("react-native/Libraries/Renderer/implementations/ReactFabric-dev.js") || 
              isTransforming("react-native/Libraries/Renderer/implementations/ReactNativeRenderer-dev.js")) {
            
            
            const { version } = requireFromAppDir("react-native/package.json");
            const rendererFileName = path.basename(filename);
            
            
            const rendererPath = createRendererPath(rendererFileName, version);
            
            if (rendererPath && fs.existsSync(rendererPath)) {
              
              try {
                const rendererCode = fs.readFileSync(rendererPath, 'utf8');
                // Add a fingerprint to verify the custom renderer is loaded.
                const fingerprint = `globalThis.__RADON_RENDERER_LOADED__ = '${path.basename(rendererPath)}';`;
                const finalRendererCode = `${fingerprint}\n${rendererCode}`;

                replaceModuleWith(programPath, finalRendererCode);
                injected = true;
              } catch (e) {
                console.error('🔥 RADON BABEL PLUGIN: 🚨 Failed to read custom renderer:', e);
              }
            } else {
              console.warn(`🔥 RADON BABEL PLUGIN: ⚠️ Custom renderer not found: ${rendererPath}`);
              if (version.startsWith("0.72")) {
                console.log(`🔥 RADON BABEL PLUGIN: ⚠️ 0.72 version detected but no custom renderer found. This might be the issue!`);
              }
            }
          }
          
          if (injected) {
            state.file.metadata.radonInjected = true;
          }
          if (isTransforming("react-native/Libraries/Core/InitializeCore.js") && !options.disableRuntimeInjection) {
            try {
              const pluginPackageJsonPath = require.resolve('@granite-js/plugin-radon/package.json', { paths: [appRoot] });
              const pluginRoot = path.dirname(pluginPackageJsonPath);
              const runtimePath = path.join(pluginRoot, 'dist', 'lib', 'runtime.cjs');
              
              const runtimeCode = fs.readFileSync(runtimePath, 'utf8');

              const devtoolsPort = process.env.RCT_DEVTOOLS_PORT;

              const portInjectionCode = devtoolsPort ? `globalThis.__REACT_DEVTOOLS_PORT__ = ${devtoolsPort};` : '';

              const finalCodeToInject = `${portInjectionCode}\n${runtimeCode}`;

              // By appending the code to the end of the file and wrapping in setImmediate,
              // we ensure all polyfills are ready before our code runs.
              const finalSafeCode = `setImmediate(() => { try { \n${finalCodeToInject}\n } catch (e) { console.error('Radon runtime error:', e); } });`;

              injectCode(programPath, finalSafeCode, false); // Append to the end
              
              state.file.metadata.radonInjected = true;
            } catch (e) {
              console.error('🔥 RADON BABEL PLUGIN: 🚨 FAILED TO READ RUNTIME BUNDLE.', e);
              throw e;
            }
            // Once handled, we are done with this file.
            return;
          }

          if (isTransforming("@granite-js/react-native")) {
            try {
              const scannedRoutes = scanGraniteRoutes();
              const routesJson = JSON.stringify(scannedRoutes, null, 2);
              
              const graniteDetectionCode = `
// Mark that Granite Router is being used
globalThis.__GRANITE_ROUTER_DETECTED__ = true;

// Inject auto-scanned routes
globalThis.__GRANITE_ROUTES = ${routesJson};
`;
              
              injectCode(programPath, graniteDetectionCode, false);
              state.file.metadata.radonInjected = true;
            } catch (e) {
              console.error('🔥 RADON BABEL PLUGIN: Failed to inject Granite detection code:', e);
            } 
          }

          const isPageFile = filename.includes('/pages/') && /\.(tsx|ts|jsx|js)$/.test(filename);
          
          if (isPageFile && !state.file.metadata.radonPageInjected) {
            try {
              
              let usesNavigation = false;
              let hasReactDefaultImport = false;
              
              programPath.traverse({
                ImportDeclaration(importPath) {
                  const source = importPath.node.source.value;
                  
                  if (source === 'react') {
                    importPath.node.specifiers.forEach(spec => {
                      if (spec.type === 'ImportDefaultSpecifier') {
                        hasReactDefaultImport = true;
                      }
                    });
                  }
                  
                  // Check for createRoute import (to prepare for Route.useNavigation pattern)
                  if (source === '@granite-js/react-native') {
                    importPath.node.specifiers.forEach(spec => {
                      if (spec.type === 'ImportSpecifier' && spec.imported.name === 'useNavigation') {
                        usesNavigation = true;
                      }
                      if (spec.type === 'ImportSpecifier' && spec.imported.name === 'createRoute') {
                        usesNavigation = true; // If createRoute exists, likely to use Route.useNavigation
                      }
                    });
                  }
                }
              });
              
              if (usesNavigation) {
                
                // Add React import (if needed)
                if (!hasReactDefaultImport) {
                  const reactImport = t.importDeclaration(
                    [t.importDefaultSpecifier(t.identifier('React'))],
                    t.stringLiteral('react')
                  );
                  programPath.unshiftContainer('body', reactImport);
                }
                
                // Find navigation-related calls and add registration code right after
                programPath.traverse({
                  VariableDeclarator(variablePath) {
                    let isNavigationVariable = false;
                    let variableName = null;
                    
                    if (variablePath.node.init && variablePath.node.id.type === 'Identifier') {
                      variableName = variablePath.node.id.name;
                      
                      // Pattern 1: const navigation = useNavigation()
                      if (variablePath.node.init.type === 'CallExpression' &&
                          variablePath.node.init.callee.name === 'useNavigation') {
                        isNavigationVariable = true;
                      }
                      
                      // Pattern 2: const navigation = Route.useNavigation()
                      else if (variablePath.node.init.type === 'CallExpression' &&
                               variablePath.node.init.callee.type === 'MemberExpression' &&
                               variablePath.node.init.callee.property.name === 'useNavigation') {
                        isNavigationVariable = true;
                      }
                    }
                    
                    if (isNavigationVariable && variableName) {
                      // Find the function or block where this variable is declared
                      const parentFunction = variablePath.getFunctionParent();
                      if (parentFunction) {
                        
                        // Generate navigation registration code
                        const registrationCode = `
  // 🔥 RadonIDE: Auto-register navigation object
  React.useEffect(() => {
    try {
      if (globalThis.__granite_register_navigation && ${variableName}) {
        globalThis.__granite_register_navigation(${variableName});
      }
    } catch (error) {
      console.log("🔥 Radon Runtime: Could not auto-register navigation:", error.message);
    }
  }, [${variableName}]);
`;
                        
                        // Parse as AST
                        const registrationAST = parse(registrationCode, { 
                          sourceType: 'module', 
                          filename: 'navigation-registration.js',
                          parserOpts: { allowReturnOutsideFunction: true }
                        });
                        
                        // Add right after variable declaration
                        const statement = variablePath.getStatementParent();
                        statement.insertAfter(registrationAST.program.body);
                      }
                    }
                  }
                });
                
                state.file.metadata.radonPageInjected = true;
              }
              
            } catch (error) {
              console.error('🔥 RADON BABEL PLUGIN: Failed to process page file:', error);
            }
          }
        }
      },
      
      // Add JSX Source visitor here
      ...jsxSourceVisitor
    }
  };
};