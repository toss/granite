import { EXECUTION_RUNTIME_ID } from './executionRuntime';
import { createRequire } from 'node:module';
import * as babel from '@babel/core';
import * as t from '@babel/types';

const generatorPlugin = createRequire(import.meta.url).resolve('@babel/plugin-transform-async-generator-functions');
const flowStripPlugin = createRequire(import.meta.url).resolve('@babel/plugin-transform-flow-strip-types');
const hermesParser = createRequire(import.meta.url).resolve('babel-plugin-syntax-hermes-parser');

const optionalPlugin = createRequire(import.meta.url).resolve('@babel/plugin-transform-optional-chaining');

const asyncPlugin = createRequire(import.meta.url).resolve('@babel/plugin-transform-async-to-generator');

/** Runs before the bundler's own async lowering so continuations use the shared execution cell. */
export function transformExecutionOwnership(id: string, code: string): babel.BabelFileResult | null {
  if (!/\.[cm]?[jt]sx?(?:\?|$)/.test(id) && !id.startsWith('\0')) {return null;}
  if (/[\\/]micro-frontend[\\/](?:src|dist[\\/]module)[\\/]execution[\\/]/.test(id)) return null;
  if (!/\b(?:async|await|then|catch|finally|setTimeout|setInterval|setImmediate|queueMicrotask|requestAnimationFrame|requestIdleCallback)\b/.test(code)) return null;

  const isTypeScript = /\.[cm]?tsx?(?:\?|$)/.test(id);
  const parserPlugins: babel.ParserOptions['plugins'] = isTypeScript ? ['typescript'] : ['flow'];
  parserPlugins.push('jsx');
  let hasAsyncFunction = false;
  let hasBoundary = false;
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
      optionalPlugin,
      function validateExecutionSyntax(): babel.PluginObj {
        return {
          visitor: {
            VariableDeclarator(path) {
              if (t.isObjectPattern(path.node.id) && t.isIdentifier(path.node.init) && ['global', 'globalThis'].includes(path.node.init.name)) hasBoundary = true;
            },
            ReferencedIdentifier(path) {
              if (['setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'requestAnimationFrame', 'requestIdleCallback'].includes(path.node.name) && !path.scope.hasBinding(path.node.name, true)) hasBoundary = true;
            },
            MemberExpression(path) {
              if (t.isIdentifier(path.node.property) && ['then', 'catch', 'finally', 'setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'requestAnimationFrame', 'requestIdleCallback'].includes(path.node.property.name)) hasBoundary = true;
              if (path.node.computed && t.isStringLiteral(path.node.property) && ['then', 'catch', 'finally'].includes(path.node.property.value)) hasBoundary = true;
            },
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
  if (!hasAsyncFunction && !hasBoundary) {return null;}

  return babel.transformFromAstSync(ast, code, {
    filename: id,
    babelrc: false,
    configFile: false,
    sourceMaps: true,
    plugins: [
      callbackBoundaryPlugin,
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
                  runtime, t.callExpression(t.identifier('require'), [t.stringLiteral(EXECUTION_RUNTIME_ID)])
                )]));
              }
              return t.memberExpression(t.cloneNode(runtime), t.identifier(exported));
            });
          },
        };
      },
      ...isTypeScript ? [] : [[flowStripPlugin, { allowDeclareFields: true }]],
      generatorPlugin,
      [asyncPlugin, { module: EXECUTION_RUNTIME_ID, method: 'asyncToGenerator' }],
    ],
  });
}

function callbackBoundaryPlugin(): babel.PluginObj {
  const schedulerNames = new Set(['setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'requestAnimationFrame', 'requestIdleCallback']);
  const methodNames = new Set(['then', 'catch', 'finally']);
  let runtime: t.Identifier | undefined;
  function helper(path: babel.NodePath, name: string): t.MemberExpression {
    if (runtime == null) {
      const program = path.findParent(parent => parent.isProgram());
      if (program == null || !program.isProgram()) throw new Error('Missing execution program');
      runtime = program.scope.generateUidIdentifier('executionBoundaries');
      program.unshiftContainer('body', t.variableDeclaration('var', [t.variableDeclarator(runtime,
        t.callExpression(t.identifier('require'), [t.stringLiteral(EXECUTION_RUNTIME_ID)]))]));
    }
    return t.memberExpression(t.cloneNode(runtime), t.identifier(name));
  }
  function property(node: t.MemberExpression): string | undefined {
    return !node.computed && t.isIdentifier(node.property) ? node.property.name : t.isStringLiteral(node.property) ? node.property.value : undefined;
  }
  return { visitor: {
    Program: { enter() { runtime = undefined; } },
    VariableDeclarator(path) {
      if (t.isObjectPattern(path.node.id) && t.isIdentifier(path.node.init) &&
          ['global', 'globalThis'].includes(path.node.init.name) && !path.scope.hasBinding(path.node.init.name, true)) {
        path.node.init = t.callExpression(helper(path, 'executionGlobals'), [path.node.init]);
      }
    },
    ReferencedIdentifier(path) {
      if (!t.isIdentifier(path.node) || path.findParent(parent => parent.isTSType()) ||
          (path.parentPath.isUnaryExpression() && path.parentPath.node.operator === 'typeof')) return;
      if (!schedulerNames.has(path.node.name) || path.scope.hasBinding(path.node.name, true)) return;
      path.replaceWith(t.callExpression(helper(path, 'executionScheduler'), [t.cloneNode(path.node)]));
      path.skip();
    },
    CallExpression: { exit(path) {
      const callee = path.node.callee;
      if (!t.isMemberExpression(callee) || t.isSuper(callee.object)) return;
      const name = property(callee);
      if (name != null && schedulerNames.has(name) && t.isIdentifier(callee.object) &&
          ['global', 'globalThis'].includes(callee.object.name) && !path.scope.hasBinding(callee.object.name, true)) {
        path.replaceWith(t.callExpression(t.callExpression(helper(path, 'executionSchedule'), [callee.object, t.stringLiteral(name)]), path.node.arguments));
        path.skip();
        return;
      }
      if (name == null || !methodNames.has(name)) return;
      path.replaceWith(t.callExpression(t.callExpression(helper(path, 'executionInvoke'), [callee.object, t.stringLiteral(name)]), path.node.arguments));
      path.skip();
    } },
    MemberExpression: { exit(path) {
      if (!path.isReferenced() || path.findParent(parent => parent.isObjectPattern() || parent.isArrayPattern())) return;
      const name = property(path.node);
      if (name == null || t.isSuper(path.node.object)) return;
      const parent = path.parentPath;
      if ((parent.isAssignmentExpression() && parent.node.left === path.node) || parent.isUpdateExpression() ||
          (parent.isUnaryExpression() && parent.node.operator === 'delete')) return;
      if (methodNames.has(name)) {
        if (parent.isCallExpression() && parent.node.callee === path.node) return;
        path.replaceWith(t.callExpression(helper(path, 'executionMethod'), [path.node.object, t.stringLiteral(name)]));
        path.skip();
      } else if (schedulerNames.has(name) && t.isIdentifier(path.node.object) &&
          ['global', 'globalThis'].includes(path.node.object.name) && !path.scope.hasBinding(path.node.object.name, true)) {
        if (parent.isCallExpression() && parent.node.callee === path.node) return;
        path.replaceWith(t.callExpression(helper(path, 'executionScheduler'), [t.cloneNode(path.node)]));
        path.skip();
      }
    } },
  } };
}
