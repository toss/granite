module.exports = function radonPolyfillBabelPlugin(api, options = {}) {
  const { parse } = api;
  
  return {
    name: 'radon-polyfill-injector',
    visitor: {
      Program: {
        enter(programPath, state) {
          const filename = state.file.opts.filename;
          if (!filename || state.file.metadata.radonPolyfillInjected) {
            return;
          }
          
          // InitializeCore.js 파일에 폴리필 주입
          if (filename.includes('react-native/Libraries/Core/InitializeCore.js')) {
            console.log('🔥 RADON POLYFILL: InitializeCore detected via babel plugin');
            
            // 빌드 타임에 환경변수에서 포트 가져오기 (babel.js와 동일한 방식)
            const devtoolsPort = process.env.RCT_DEVTOOLS_PORT;
            const portInjectionCode = devtoolsPort ? `globalThis.__REACT_DEVTOOLS_PORT__ = ${devtoolsPort};` : `globalThis.__REACT_DEVTOOLS_PORT__ = ${options.devtoolsPort || 8097};`;
            
            const polyfillCode = `
setImmediate(() => {
  try {
    ${portInjectionCode}
    console.log('🔥 RADON POLYFILL: Set DevTools port to', globalThis.__REACT_DEVTOOLS_PORT__);
    console.log('🔥 RADON POLYFILL: Port from build env:', ${devtoolsPort ? devtoolsPort : 'undefined'});
    
    if (globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('🔥 RADON POLYFILL: Loading React DevTools polyfill');
      require('@granite-js/plugin-radon/lib/react_devtools_polyfill');
      console.log('🔥 RADON POLYFILL: globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__', globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__);
      console.log('🔥 RADON POLYFILL: React DevTools polyfill loaded successfully');
    } else {
      console.log('🔥 RADON POLYFILL: globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ not detected');
    }
  } catch (e) {
    console.error('🔥 RADON POLYFILL: Failed to load polyfill:', e);
  }
});
`;
            
            const ast = parse(polyfillCode, { 
              sourceType: 'module', 
              filename: 'radon-polyfill-injection.js',
              parserOpts: { allowReturnOutsideFunction: true }
            });
            
            // 코드 끝에 주입
            programPath.pushContainer('body', ast.program.body);
            state.file.metadata.radonPolyfillInjected = true;
          }
        }
      }
    }
  };
};