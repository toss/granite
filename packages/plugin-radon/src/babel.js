const fs = require('fs');
const path = require('path');
const createJSXSourceVisitor = require('./jsx-source-visitor');

module.exports = function(api, options = {}) {
  api.assertVersion(7);
  
  const { parse, types: t } = api; // types를 올바르게 destructure
  
  const appRoot = process.cwd();
  
  // Granite Router 자동 라우트 스캔 함수 (router.gen.ts 기반)
  const scanGraniteRoutes = () => {
    try {
      const routerGenPath = path.join(appRoot, 'src', 'router.gen.ts');
      
      // router.gen.ts 파일이 존재하는지 확인
      if (fs.existsSync(routerGenPath)) {
        return parseRouterGenFile(routerGenPath);
      }
      
      // router.gen.ts가 없으면 pages/ 폴더 직접 스캔 (fallback)
      return scanPagesFolderDirect();
      
    } catch (error) {
      console.error('🔥 RADON BABEL PLUGIN: Route scanning failed:', error);
      return [{
        path: "/",
        filePath: "./pages/index.tsx",
        type: "route"
      }]; // 기본 라우트
    }
  };
  
  // router.gen.ts 파일을 파싱하여 라우트 정보 추출
  const parseRouterGenFile = (routerGenPath) => {
    try {
      const content = fs.readFileSync(routerGenPath, 'utf8');
      const routes = [];
      
      // import 구문에서 라우트 정보 추출
      // import { Route as _IndexRoute } from '../pages/index';
      // import { Route as _AboutRoute } from '../pages/about';
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
  
  // 페이지 경로를 라우트 경로로 변환 (Granite Router 방식)
  const convertPagePathToRoute = (pagePath) => {
    // index → /
    // about → /about  
    // user/profile → /user/profile
    // user/[id] → /user/:id
    
    let routePath = pagePath
      .replace(/\/index$/, '') // /index → 빈 문자열
      .replace(/\[([^\]]+)\]/g, ':$1'); // [id] → :id (동적 라우트)
    
    // 빈 문자열이면 루트 경로
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

  // JSX Source visitor 생성
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
          
          // --- React Native 렌더러 파일 교체 ---
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
                // 실패 시 원본 파일 유지
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
          // runtime 주입이 비활성화되지 않은 경우만 주입
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
              // 실제 파일 시스템에서 라우트 스캔
              const scannedRoutes = scanGraniteRoutes();
              const routesJson = JSON.stringify(scannedRoutes, null, 2);
              
              // 스캔된 라우트를 앱에 주입
              const graniteDetectionCode = `
// Mark that Granite Router is being used
globalThis.__GRANITE_ROUTER_DETECTED__ = true;

// 자동 스캔된 라우트 주입
globalThis.__GRANITE_ROUTES = ${routesJson};
`;
              
              injectCode(programPath, graniteDetectionCode, false);
              state.file.metadata.radonInjected = true;
            } catch (e) {
              console.error('🔥 RADON BABEL PLUGIN: Failed to inject Granite detection code:', e);
            } 
          }

          // pages/ 폴더의 파일들에 navigation 등록 코드 자동 주입
          const isPageFile = filename.includes('/pages/') && /\.(tsx|ts|jsx|js)$/.test(filename);
          
          if (isPageFile && !state.file.metadata.radonPageInjected) {
            try {
              
              // AST를 순회하면서 useNavigation 훅 사용 여부 확인
              let usesNavigation = false;
              let hasUseEffect = false;
              let hasReactImport = false;
              let hasReactDefaultImport = false;
              
              programPath.traverse({
                ImportDeclaration(importPath) {
                  const source = importPath.node.source.value;
                  
                  // React import 확인
                  if (source === 'react') {
                    hasReactImport = true;
                    importPath.node.specifiers.forEach(spec => {
                      if (spec.type === 'ImportDefaultSpecifier') {
                        hasReactDefaultImport = true;
                      }
                      if (spec.type === 'ImportSpecifier' && spec.imported.name === 'useEffect') {
                        hasUseEffect = true;
                      }
                    });
                  }
                  
                  // createRoute import 확인 (Route.useNavigation 패턴 대비)
                  if (source === '@granite-js/react-native') {
                    importPath.node.specifiers.forEach(spec => {
                      if (spec.type === 'ImportSpecifier' && spec.imported.name === 'useNavigation') {
                        usesNavigation = true;
                      }
                      if (spec.type === 'ImportSpecifier' && spec.imported.name === 'createRoute') {
                        usesNavigation = true; // createRoute가 있으면 Route.useNavigation을 사용할 가능성
                      }
                    });
                  }
                }
              });
              
              if (usesNavigation) {
                
                // React import 추가 (필요한 경우)
                if (!hasReactDefaultImport) {
                  const reactImport = t.importDeclaration(
                    [t.importDefaultSpecifier(t.identifier('React'))],
                    t.stringLiteral('react')
                  );
                  programPath.unshiftContainer('body', reactImport);
                }
                
                // navigation 관련 호출을 찾아서 바로 다음에 등록 코드 추가
                programPath.traverse({
                  VariableDeclarator(variablePath) {
                    let isNavigationVariable = false;
                    let variableName = null;
                    
                    if (variablePath.node.init && variablePath.node.id.type === 'Identifier') {
                      variableName = variablePath.node.id.name;
                      
                      // 패턴 1: const navigation = useNavigation()
                      if (variablePath.node.init.type === 'CallExpression' &&
                          variablePath.node.init.callee.name === 'useNavigation') {
                        isNavigationVariable = true;
                      }
                      
                      // 패턴 2: const navigation = Route.useNavigation()
                      else if (variablePath.node.init.type === 'CallExpression' &&
                               variablePath.node.init.callee.type === 'MemberExpression' &&
                               variablePath.node.init.callee.property.name === 'useNavigation') {
                        isNavigationVariable = true;
                      }
                    }
                    
                    if (isNavigationVariable && variableName) {
                      // 해당 변수가 선언된 함수나 블록 찾기
                      const parentFunction = variablePath.getFunctionParent();
                      if (parentFunction) {
                        
                        // navigation 등록 코드 생성
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
                        
                        // AST로 파싱
                        const registrationAST = parse(registrationCode, { 
                          sourceType: 'module', 
                          filename: 'navigation-registration.js',
                          parserOpts: { allowReturnOutsideFunction: true }
                        });
                        
                        // 변수 선언 바로 다음에 추가
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
      
      // JSX Source visitor를 여기에 추가
      ...jsxSourceVisitor
    }
  };
};