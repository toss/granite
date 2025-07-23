const fs = require('fs');

// Parse router.gen.ts file to extract route information using AST
const parseRouterGenFile = (parse, routerGenPath) => {
  try {
    const content = fs.readFileSync(routerGenPath, 'utf8');
    const routes = [];
    const routeTypeMap = new Map(); // path -> param types
    
    // Parse TypeScript content as JavaScript (works for most TS syntax)
    const ast = parse(content, {
      sourceType: 'module',
      filename: routerGenPath,
      parserOpts: {
        plugins: ['typescript', 'jsx']
      }
    });
    
    // Traverse the AST to find import declarations and type declarations
    const traverse = (node) => {
      // Extract route imports
      if (node.type === 'ImportDeclaration') {
        // Check if import source matches pattern: '../pages/...'
        const source = node.source.value;
        if (source && source.startsWith('../pages/')) {
          // Extract page path from import source
          const pagePath = source.replace('../pages/', '');
          
          // Find the Route import specifier with alias
          const routeSpecifier = node.specifiers.find(spec => 
            spec.type === 'ImportSpecifier' && 
            spec.imported.name === 'Route' &&
            spec.local.name.endsWith('Route')
          );
          
          if (routeSpecifier) {
            const componentName = routeSpecifier.local.name.replace(/^_(.*)Route$/, '$1');
            const routePath = convertPagePathToRoute(pagePath);
            
            routes.push({
              path: routePath,
              filePath: `./pages/${pagePath}.tsx`,
              componentName: componentName,
              type: 'route'
            });
          }
        }
      }
      
      // Extract type information from declare module
      if (node.type === 'TSModuleDeclaration' && 
          node.id.type === 'StringLiteral' && 
          node.id.value === '@granite-js/react-native') {
        
        // Look for RegisterScreen interface
        if (node.body && node.body.type === 'TSModuleBlock') {
          node.body.body.forEach(stmt => {
            if (stmt.type === 'TSInterfaceDeclaration' && stmt.id.name === 'RegisterScreen') {
              // Parse interface properties: '/path': ReturnType<typeof _RouteAlias.useParams>
              stmt.body.body.forEach(member => {
                if (member.type === 'TSPropertySignature' && member.key) {
                  const routePath = member.key.type === 'StringLiteral' ? member.key.value : member.key.name;
                  
                  // Extract parameter type info from ReturnType<typeof _RouteAlias.useParams>
                  if (member.typeAnnotation && member.typeAnnotation.typeAnnotation) {
                    // For now, just mark that this route has type information available
                    routeTypeMap.set(routePath, { hasTypes: true });
                  }
                }
              });
            }
          });
        }
      }
      
      // Recursively traverse child nodes
      for (const key in node) {
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach(traverse);
        } else if (child && typeof child === 'object' && child.type) {
          traverse(child);
        }
      }
    };
    
    traverse(ast);
    
    // Note: Type information is collected but not added to routes to maintain compatibility
    // routeTypeMap contains the parameter types for each route if needed later
    
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

module.exports = {
  parseRouterGenFile,
  convertPagePathToRoute
};