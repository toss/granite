// jsx-source-visitor.js
module.exports = function createJSXSourceVisitor(t) {
    return {
      JSXElement(path, state) {        
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction) {
          return;
        }
  
        const node = path.node;
        const loc = node.loc;
        const filename = state.file.opts.filename;
        
        // Skip React.Fragment or Fragment
        const elementName = node.openingElement.name;
        if (t.isJSXIdentifier(elementName)) {
          if (elementName.name === 'Fragment') {
            return;
          }
        } else if (t.isJSXMemberExpression(elementName)) {
          if (elementName.property.name === 'Fragment') {
            return;
          }
        }
        
  
        // Add _source only when position info and filename are available
        if (loc && filename) {
          // Check if _source attribute already exists
          const hasSourceAttr = node.openingElement.attributes.some(attr => 
            t.isJSXAttribute(attr) && 
            t.isJSXIdentifier(attr.name) && 
            attr.name.name === '_source'
          );
  
  
          if (!hasSourceAttr) {
            // Create _source attribute
            const sourceAttr = t.jsxAttribute(
              t.jsxIdentifier('_source'),
              t.jsxExpressionContainer(
                t.objectExpression([
                  t.objectProperty(
                    t.identifier('fileName'),
                    t.stringLiteral(filename)
                  ),
                  t.objectProperty(
                    t.identifier('lineNumber'),
                    t.numericLiteral(loc.start.line)
                  ),
                  t.objectProperty(
                    t.identifier('columnNumber'),
                    t.numericLiteral(loc.start.column)
                  )
                ])
              )
            );
  
            // Add _source to existing attributes
            node.openingElement.attributes.push(sourceAttr);
            
          }
        } else {
          console.log(`🔥 RADON JSX SOURCE: Missing loc or filename - loc:`, loc, 'filename:', filename);
        }
      }
    };
  };