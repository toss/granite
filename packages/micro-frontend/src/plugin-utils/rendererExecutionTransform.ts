import { EXECUTION_RUNTIME_ID } from './executionRuntime';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as babel from '@babel/core';
import * as t from '@babel/types';

interface Boundary {
  readonly owner: string;
  readonly helper?: 'bindFiberListener' | 'attachRef' | 'detachRef';
  readonly rendering?: boolean;
}

const REQUIRED: Readonly<Record<string, Boundary>> = {
  beginWork: { owner: 'workInProgress', rendering: true },
  renderWithHooks: { owner: 'workInProgress', rendering: true },
  renderWithHooksAgain: { owner: 'workInProgress', rendering: true },
  getListener: { owner: 'inst', helper: 'bindFiberListener' },
  getListener$1: { owner: 'inst', helper: 'bindFiberListener' },
  commitHookEffectListMount: { owner: 'finishedWork' },
  commitHookEffectListUnmount: { owner: 'finishedWork' },
  commitClassCallbacks: { owner: 'finishedWork' },
  safelyCallComponentWillUnmount: { owner: 'current' },
  safelyAttachRef: { owner: 'current', helper: 'attachRef' },
  safelyDetachRef: { owner: 'current', helper: 'detachRef' },
  commitLayoutEffectOnFiber: { owner: 'finishedWork' },
  commitDeletionEffectsOnFiber: { owner: 'deletedFiber' },
  commitPassiveMountOnFiber: { owner: 'finishedWork' },
  commitPassiveUnmountOnFiber: { owner: 'finishedWork' },
  subscribeToStore: { owner: 'fiber' },
  updateStoreInstance: { owner: 'fiber' },
};
const OPTIONAL: Readonly<Record<string, Boundary>> = {
  commitClassSnapshot: { owner: 'finishedWork' },
  commitProfiler: { owner: 'finishedWork' },
  commitProfilerPostCommitImpl: { owner: 'finishedWork' },
  reappearLayoutEffects: { owner: 'finishedWork' },
  disappearLayoutEffects: { owner: 'finishedWork' },
};
const CLASS_LIFECYCLES = new Set([
  'componentDidMount', 'componentDidUpdate', 'componentWillUnmount', 'componentDidCatch', 'getSnapshotBeforeUpdate',
]);

export function transformRendererExecution(id: string, source: string): babel.BabelFileResult | null {
  const filename = id.split('?')[0] ?? id;
  if (!/\/(?:ReactFabric|ReactNativeRenderer)-(?:dev|prod)\.js$/.test(filename.replaceAll('\\', '/'))) {
    return null;
  }
  const manifest = JSON.parse(fs.readFileSync(path.resolve(path.dirname(filename), '../../../package.json'), 'utf8'));
  if (manifest.version !== '0.84.0') {
    throw new Error(`Unsupported execution renderer version: ${String(manifest.version)}`);
  }
  if (!/ReactFabric-(?:dev|prod)\.js$/.test(filename)) {
    // Fabric also imports legacy renderer utilities such as findNodeHandle.
    // Preserve those exports and reject only creation of an uninstrumented root.
    let entries = 0;
    const result = babel.transformSync(source, {
      filename, babelrc: false, configFile: false, sourceMaps: true,
      plugins: [function rejectLegacyRoot(): babel.PluginObj {
        return { visitor: { AssignmentExpression(assignment) {
          const { left, right } = assignment.node;
          if (!t.isMemberExpression(left) || left.computed ||
              !t.isIdentifier(left.object, { name: 'exports' }) ||
              !t.isIdentifier(left.property, { name: 'render' })) {return;}
          if (!t.isFunctionExpression(right)) {
            throw assignment.buildCodeFrameError('Unrecognized legacy render entry');
          }
          entries++;
          right.body = t.blockStatement([t.throwStatement(t.newExpression(t.identifier('Error'), [
            t.stringLiteral('Execution ownership currently requires the Fabric renderer'),
          ]))]);
        } } };
      }],
    });
    if (entries !== 1) {throw new Error('Legacy renderer contract mismatch for render');}
    return result;
  }
  return instrumentRenderer(source, filename);
}

/** Validate the renderer profile before instrumenting its per-Fiber execution boundaries. */
export function instrumentRenderer(source: string, filename: string): babel.BabelFileResult {
  const seen = new Map<string, number>();
  let runtimeName = '';
  let storeCallbacks = 0;
  const result = babel.transformSync(source, {
    filename, babelrc: false, configFile: false, sourceType: 'unambiguous', sourceMaps: true,
    plugins: [function executionRenderer(): babel.PluginObj {
      return {
        visitor: {
          Program: {
            enter(program) {
              runtimeName = program.scope.generateUidIdentifier('graniteExecution').name;
              program.unshiftContainer('body', [
                t.variableDeclaration('var', [t.variableDeclarator(
                  t.identifier(runtimeName),
                  t.callExpression(t.identifier('require'), [t.stringLiteral(EXECUTION_RUNTIME_ID)])
                )]),
                t.expressionStatement(t.callExpression(
                  t.memberExpression(t.identifier(runtimeName), t.identifier('registerRenderer')),
                  [t.stringLiteral('react-native@0.84.0')]
                )),
              ]);
            },
          },
          FunctionDeclaration(fn) {
            const name = fn.node.id?.name;
            if (name == null) {return;}
            if (name === 'findCurrentFiberUsingSlowPath') {
              seen.set(name, (seen.get(name) ?? 0) + 1);
              return;
            }
            const boundary = REQUIRED[name] ?? OPTIONAL[name];
            if (boundary == null && name !== 'pushSimpleEffect') {return;}
            seen.set(name, (seen.get(name) ?? 0) + 1);
            if (name === 'pushSimpleEffect') {
              if (!fn.node.params.some((param) => t.isIdentifier(param, { name: 'create' }))) {
                throw fn.buildCodeFrameError('Unrecognized effect registration signature');
              }
              fn.node.body.body.unshift(t.expressionStatement(t.assignmentExpression(
                '=', t.identifier('create'),
                t.callExpression(t.memberExpression(t.identifier(runtimeName), t.identifier('bindEffect')), [t.identifier('create')])
              )));
              return;
            }
            if (boundary == null || !fn.node.params.some((param) => t.isIdentifier(param, { name: boundary.owner }))) {
              throw fn.buildCodeFrameError(`Unrecognized execution boundary signature: ${name}`);
            }
            const original = fn.node.body;
            const owner = boundary.helper === 'bindFiberListener'
              ? t.callExpression(t.identifier('findCurrentFiberUsingSlowPath'), [t.identifier(boundary.owner)])
              : t.identifier(boundary.owner);
            const args: t.Expression[] = [owner, t.arrowFunctionExpression([], original)];
            if (boundary.rendering) {args.push(t.booleanLiteral(true));}
            fn.node.body = t.blockStatement([t.returnStatement(t.callExpression(
              t.memberExpression(t.identifier(runtimeName), t.identifier(boundary.helper ?? 'runWithFiber')), args
            ))]);
          },
          CallExpression(call) {
            const callee = call.node.callee;
            if (t.isIdentifier(callee, { name: 'subscribe' }) && call.findParent(
              (parent) => parent.isFunctionDeclaration() && parent.node.id?.name === 'subscribeToStore'
            )) {
              const callback = call.node.arguments[0];
              if (callback == null || !t.isExpression(callback)) {
                throw call.buildCodeFrameError('Unrecognized external-store subscription');
              }
              call.node.arguments[0] = t.callExpression(
                t.memberExpression(t.identifier(runtimeName), t.identifier('bindCallback')), [callback]
              );
              storeCallbacks++;
              call.skip();
              return;
            }
            if (t.isMemberExpression(callee) && !callee.computed && t.isIdentifier(callee.property) &&
                CLASS_LIFECYCLES.has(callee.property.name) && t.isExpression(callee.object)) {
              const original = t.cloneNode(call.node, true);
              call.replaceWith(t.callExpression(
                t.memberExpression(t.identifier(runtimeName), t.identifier('runWithInstance')),
                [t.cloneNode(callee.object, true), t.arrowFunctionExpression([], original), t.identifier('findCurrentFiberUsingSlowPath')]
              ));
              call.skip();
            }
          },
        },
      };
    }],
  });
  for (const name of [...Object.keys(REQUIRED), 'pushSimpleEffect', 'findCurrentFiberUsingSlowPath']) {
    if (seen.get(name) !== 1) {throw new Error(`Execution renderer contract mismatch for ${name}: expected one boundary`);}
  }
  if (storeCallbacks !== 1 || result?.code == null) {throw new Error('Execution renderer external-store contract mismatch');}
  return result;
}
