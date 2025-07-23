// Navigation auto-registration utilities for RadonIDE

/**
 * Generate navigation registration code
 * @param {string} navigationVariableName - Name of the navigation variable
 * @returns {string} - Registration code to inject
 */
const generateNavigationRegistrationCode = (navigationVariableName) => {
  return `
  // 🔥 RadonIDE: Auto-register navigation object
  React.useEffect(() => {
    try {
      if (globalThis.__granite_register_navigation && ${navigationVariableName}) {
        globalThis.__granite_register_navigation(${navigationVariableName});
      }
    } catch (error) {
      console.log("🔥 Radon Runtime: Could not auto-register navigation:", error.message);
    }
  }, [${navigationVariableName}]);
`;
};

/**
 * Check if a page file uses navigation-related imports
 * @param {Object} programPath - Babel program path
 * @returns {Object} - { usesNavigation: boolean, hasReactDefaultImport: boolean }
 */
const analyzePageImports = (programPath) => {
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
  
  return { usesNavigation, hasReactDefaultImport };
};

/**
 * Process navigation variables and inject registration code
 * @param {Object} programPath - Babel program path
 * @param {Function} parse - Babel parse function
 * @param {Object} t - Babel types
 */
const processNavigationVariables = (programPath, parse) => {
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
          const registrationCode = generateNavigationRegistrationCode(variableName);
          
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
};

const processPageFile = (filename, programPath, parse, t, state) => {
  const isPageFile = filename.includes('/pages/') && /\.(tsx|ts|jsx|js)$/.test(filename);
  
  if (!isPageFile || state.file.metadata.radonPageInjected) {
    return false;
  }
  
  try {
    const { usesNavigation, hasReactDefaultImport } = analyzePageImports(programPath);
    
    if (usesNavigation) {
      // Add React import (if needed)
      if (!hasReactDefaultImport) {
        const reactImport = t.importDeclaration(
          [t.importDefaultSpecifier(t.identifier('React'))],
          t.stringLiteral('react')
        );
        programPath.unshiftContainer('body', reactImport);
      }
      
      // Process navigation variables and inject registration code
      processNavigationVariables(programPath, parse, t);
      
      state.file.metadata.radonPageInjected = true;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('🔥 RADON BABEL PLUGIN: Failed to process page file:', error);
    return false;
  }
};

module.exports = {
  generateNavigationRegistrationCode,
  analyzePageImports,
  processNavigationVariables,
  processPageFile
};