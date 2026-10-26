import { createRequire } from 'node:module';
import * as babel from '@babel/core';
import * as t from '@babel/types';

const generatorPlugin = createRequire(import.meta.url).resolve('@babel/plugin-transform-async-generator-functions');
const flowStripPlugin = createRequire(import.meta.url).resolve('@babel/plugin-transform-flow-strip-types');
const hermesParser = createRequire(import.meta.url).resolve('babel-plugin-syntax-hermes-parser');

const asyncPlugin = createRequire(import.meta.url).resolve('@babel/plugin-transform-async-to-generator');

/** Runs before the bundler's own async lowering so continuations use the shared execution cell. */
export function transformExecutionOwnership(id: string, code: string): babel.BabelFileResult | null {
  if (!/\.[cm]?[jt]sx?(?:\?|$)/.test(id) && !id.startsWith('\0')) {return null;}
  if (!/\b(?:async|await)\b/.test(code)) {return null;}

  const isTypeScript = /\.[cm]?tsx?(?:\?|$)/.test(id);
  const parserPlugins: babel.ParserOptions['plugins'] = isTypeScript ? ['typescript'] : ['flow'];
  parserPlugins.push('jsx');
  let hasAsyncFunction = false;
  const validated = babel.transformSync(code, {
    filename: id,
    babelrc: false,
    configFile: false,
    sourceType: 'unambiguous',
    parserOpts: { plugins: parserPlugins },
    ast: true,
    code: false,
    plugins: [
      ...isTypeScript ? [] : [hermesParser],
      function validateExecutionSyntax(): babel.PluginObj {
        return {
          visitor: {
            Function(path) {
              if (!path.node.async) {return;}
              hasAsyncFunction = true;
            },
            AwaitExpression(path) {
              if (path.getFunctionParent() == null) {
                throw path.buildCodeFrameError('Execution ownership does not yet support top-level await');
              }
            },
          },
        };
      },
    ],
  });
  const ast = validated?.ast;
  if (ast == null) {throw new Error(`Cannot parse execution ownership input: ${id}`);}
  if (!hasAsyncFunction) {return null;}

  return babel.transformFromAstSync(ast, code, {
    filename: id,
    babelrc: false,
    configFile: false,
    sourceMaps: true,
    plugins: [
      function ownedGeneratorHelpers(): babel.PluginObj {
        return {
          visitor: {},
          pre(file) {
            let runtime: t.Identifier | undefined;
            const set: unknown = Reflect.get(file, 'set');
            if (typeof set !== 'function') {throw new Error('Babel helper integration is unavailable');}
            // @types/babel__core carries an older AST declaration than the installed Babel runtime.
            const program = file.path as unknown as { unshiftContainer(name: 'body', statement: t.Statement): unknown };
            set.call(file, 'helperGenerator', (name: string) => {
              const exported = name === 'wrapAsyncGenerator' ? name : name === 'OverloadYield' ? 'AsyncGeneratorYield' : null;
              if (exported == null) {return undefined;}
              if (runtime == null) {
                runtime = t.identifier(file.scope.generateUid('executionHelpers'));
                program.unshiftContainer('body', t.variableDeclaration('var', [t.variableDeclarator(
                  runtime, t.callExpression(t.identifier('require'), [t.stringLiteral('@granite-js/micro-frontend/execution')])
                )]));
              }
              return t.memberExpression(t.cloneNode(runtime), t.identifier(exported));
            });
          },
        };
      },
      ...isTypeScript ? [] : [[flowStripPlugin, { allowDeclareFields: true }]],
      generatorPlugin,
      [asyncPlugin, { module: '@granite-js/micro-frontend/execution', method: 'asyncToGenerator' }],
    ],
  });
}
