const fs = require('fs');

const parseRouterGenFile = (parse, routerGenPath) => {
  try {
    const content = fs.readFileSync(routerGenPath, 'utf8');
    const routes = [];
    const routeTypeMap = new Map(); // path -> param types

    const ast = parse(content, {
      sourceType: 'module',
      filename: routerGenPath,
      parserOpts: {
        plugins: ['typescript', 'jsx'],
      },
    });

    const traverse = (node) => {
      if (node.type === 'ImportDeclaration') {
        const source = node.source.value;
        if (source && source.startsWith('../pages/')) {
          const pagePath = source.replace('../pages/', '');

          const routeSpecifier = node.specifiers.find(
            (spec) =>
              spec.type === 'ImportSpecifier' && spec.imported.name === 'Route' && spec.local.name.endsWith('Route')
          );

          if (routeSpecifier) {
            const componentName = routeSpecifier.local.name.replace(/^_(.*)Route$/, '$1');
            const routePath = convertPagePathToRoute(pagePath);

            routes.push({
              path: routePath,
              filePath: `./pages/${pagePath}.tsx`,
              componentName: componentName,
              type: 'route',
            });
          }
        }
      }

      if (
        node.type === 'TSModuleDeclaration' &&
        node.id.type === 'StringLiteral' &&
        node.id.value === '@granite-js/react-native'
      ) {
        if (node.body && node.body.type === 'TSModuleBlock') {
          node.body.body.forEach((stmt) => {
            if (stmt.type === 'TSInterfaceDeclaration' && stmt.id.name === 'RegisterScreen') {
              stmt.body.body.forEach((member) => {
                if (member.type === 'TSPropertySignature' && member.key) {
                  const routePath = member.key.type === 'StringLiteral' ? member.key.value : member.key.name;

                  if (member.typeAnnotation && member.typeAnnotation.typeAnnotation) {
                    routeTypeMap.set(routePath, { hasTypes: true });
                  }
                }
              });
            }
          });
        }
      }

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

    return routes;
  } catch (error) {
    console.error('🔥 RADON BABEL PLUGIN: Failed to parse router.gen.ts:', error);
    return [];
  }
};

const convertPagePathToRoute = (pagePath) => {
  // index → /
  // about → /about
  // user/profile → /user/profile
  // user/[id] → /user/:id

  let routePath = pagePath.replace(/\/index$/, '').replace(/\[([^\]]+)\]/g, ':$1');

  if (!routePath || routePath === '' || routePath === 'index') {
    routePath = '/';
  } else if (!routePath.startsWith('/')) {
    routePath = '/' + routePath;
  }

  return routePath;
};

module.exports = {
  parseRouterGenFile,
  convertPagePathToRoute,
};
