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
            
            const devtoolsPort = process.env.RCT_DEVTOOLS_PORT;
            const portInjectionCode = devtoolsPort ? `globalThis.__REACT_DEVTOOLS_PORT__ = ${devtoolsPort};` : `globalThis.__REACT_DEVTOOLS_PORT__ = ${options.devtoolsPort || 8097};`;
            
            const polyfillCode = `
setImmediate(() => {
  try {
    ${portInjectionCode}
    
    if (globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      require('@granite-js/plugin-radon/lib/RNpolyfill/react_devtools_polyfill');
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