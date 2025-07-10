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
        
        // React.Fragment나 Fragment는 건너뛰기
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
        
  
        // 위치 정보와 파일명이 있는 경우에만 _source 추가
        if (loc && filename) {
          // 이미 _source 속성이 있는지 확인
          const hasSourceAttr = node.openingElement.attributes.some(attr => 
            t.isJSXAttribute(attr) && 
            t.isJSXIdentifier(attr.name) && 
            attr.name.name === '_source'
          );
  
  
          if (!hasSourceAttr) {
            // _source 속성 생성
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
  
            // 기존 속성들에 _source 추가
            node.openingElement.attributes.push(sourceAttr);
            
          }
        } else {
          console.log(`🔥 RADON JSX SOURCE: Missing loc or filename - loc:`, loc, 'filename:', filename);
        }
      }
    };
  };