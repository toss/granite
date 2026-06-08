import { transformSync } from '@babel/core';

const SCOPED_TIMER_CALLEES = {
  clearInterval: 'clearScopedInterval',
  clearTimeout: 'clearScopedTimeout',
  cancelAnimationFrame: 'cancelScopedAnimationFrame',
  requestAnimationFrame: 'requestScopedAnimationFrame',
  setInterval: 'setScopedInterval',
  setTimeout: 'setScopedTimeout',
} as const;

const REMOTE_CONTEXT_IDENTIFIER = 'globalThis.__GRANITE_MICRO_FRONTEND_REMOTE__';
const SCOPED_REMOTE_SCOPE_IDENTIFIER = '__graniteScopedRemoteScope';

const BASE_PARSER_PLUGINS = [
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'decorators-legacy',
  'dynamicImport',
  'exportDefaultFrom',
  'exportNamespaceFrom',
  'importMeta',
  'jsx',
  'nullishCoalescingOperator',
  'objectRestSpread',
  'optionalChaining',
  'topLevelAwait',
] as const;

type ScopedTimersOptions = {
  containerName: string;
};

type Replacement = {
  end: number;
  start: number;
  text: string;
};

type BabelPath = {
  node: {
    arguments?: unknown[];
    callee?: unknown;
  };
  scope: {
    getBinding(name: string): unknown;
  };
};

type BabelProgramPath = {
  node: {
    body?: Array<{
      directive?: string;
      end?: number | null;
      type?: string;
    }>;
    directives?: Array<{
      end?: number | null;
      value?: {
        end?: number | null;
      };
    }>;
    interpreter?: {
      end?: number | null;
    } | null;
  };
};

type BabelIdentifier = {
  end?: number | null;
  name: string;
  start?: number | null;
  type: 'Identifier';
};

export function createScopedTimersTransformer(options: ScopedTimersOptions) {
  return (id: string, code: string) => transformScopedTimers(id, code, options);
}

export function transformScopedTimers(id: string, code: string, options: ScopedTimersOptions) {
  if (!shouldTransform(id, code)) {
    return code;
  }

  const replacements = collectScopedTimerReplacements(id, code, options);

  if (replacements.length === 0) {
    return code;
  }

  return applyReplacements(code, replacements);
}

function shouldTransform(id: string, code: string) {
  const normalizedId = id.replace(/\\/g, '/').replace(/\?.*$/, '');

  if (
    normalizedId.includes('/.granite/') ||
    normalizedId.includes('/packages/plugin-micro-frontend/src/runtime/') ||
    normalizedId.includes('/@granite-js/plugin-micro-frontend/') ||
    normalizedId.endsWith('/micro-frontend-runtime.js')
  ) {
    return false;
  }

  return Object.keys(SCOPED_TIMER_CALLEES).some(callee => code.includes(callee));
}

function collectScopedTimerReplacements(id: string, code: string, options: ScopedTimersOptions) {
  const parserPluginSets = getParserPluginSets(id);

  for (const parserPlugins of parserPluginSets) {
    try {
      return collectScopedTimerReplacementsWithParserPlugins(id, code, parserPlugins, options);
    } catch {
      continue;
    }
  }

  return [];
}

function collectScopedTimerReplacementsWithParserPlugins(
  id: string,
  code: string,
  parserPlugins: string[],
  options: ScopedTimersOptions
) {
  const replacements: Replacement[] = [];
  let scopeCaptureInsertionIndex = 0;

  transformSync(code, {
    ast: false,
    babelrc: false,
    code: false,
    configFile: false,
    filename: id,
    parserOpts: {
      plugins: parserPlugins as any,
      sourceType: 'unambiguous',
    },
    plugins: [
      () => ({
        visitor: {
          Program(path: BabelProgramPath) {
            scopeCaptureInsertionIndex = getScopeCaptureInsertionIndex(path.node);
          },
          CallExpression(path: BabelPath) {
            const callee = path.node.callee;

            if (!isIdentifier(callee)) {
              return;
            }

            const runtimeCallee = getRuntimeCallee(callee.name);

            if (runtimeCallee == null || isLocalTimerBinding(path.scope.getBinding(callee.name))) {
              return;
            }

            const replacement = createScopedTimerReplacement(code, callee, runtimeCallee);

            if (replacement == null) {
              return;
            }

            replacements.push(...replacement);
          },
        },
      }),
    ],
    sourceType: 'unambiguous',
  });

  if (replacements.length > 0) {
    replacements.push(createScopeCaptureReplacement(scopeCaptureInsertionIndex, options));
  }

  return replacements;
}

function getParserPluginSets(id: string) {
  const normalizedId = id.replace(/\\/g, '/').replace(/\?.*$/, '');
  const isTypeScript = /\.[cm]?tsx?$/.test(normalizedId);

  if (isTypeScript) {
    return [[...BASE_PARSER_PLUGINS, 'typescript']];
  }

  return [[...BASE_PARSER_PLUGINS], [...BASE_PARSER_PLUGINS, 'flow']];
}

function createScopedTimerReplacement(code: string, callee: BabelIdentifier, runtimeCallee: string) {
  if (callee.start == null || callee.end == null) {
    return null;
  }

  const openParenIndex = findNextNonWhitespaceIndex(code, callee.end);

  if (code[openParenIndex] !== '(') {
    return null;
  }

  return [
    {
      start: callee.start,
      end: callee.end,
      text: `${REMOTE_CONTEXT_IDENTIFIER}.${runtimeCallee}`,
    },
    {
      start: openParenIndex + 1,
      end: openParenIndex + 1,
      text: `${SCOPED_REMOTE_SCOPE_IDENTIFIER},`,
    },
  ];
}

function createScopeCaptureReplacement(insertionIndex: number, options: ScopedTimersOptions): Replacement {
  return {
    start: insertionIndex,
    end: insertionIndex,
    text: `${insertionIndex > 0 ? '\n' : ''}var ${SCOPED_REMOTE_SCOPE_IDENTIFIER} = ${REMOTE_CONTEXT_IDENTIFIER}.getScopedResourceScope("${options.containerName}");\n`,
  };
}

function getScopeCaptureInsertionIndex(programNode: BabelProgramPath['node']) {
  let insertionIndex = programNode.interpreter?.end ?? 0;

  for (const directive of programNode.directives ?? []) {
    insertionIndex = Math.max(insertionIndex, directive.end ?? directive.value?.end ?? insertionIndex);
  }

  for (const statement of programNode.body ?? []) {
    if (statement.type === 'ImportDeclaration' || statement.directive != null) {
      insertionIndex = Math.max(insertionIndex, statement.end ?? insertionIndex);
      continue;
    }

    break;
  }

  return insertionIndex;
}

function getRuntimeCallee(callee: string) {
  return Object.prototype.hasOwnProperty.call(SCOPED_TIMER_CALLEES, callee)
    ? SCOPED_TIMER_CALLEES[callee as keyof typeof SCOPED_TIMER_CALLEES]
    : null;
}

function isLocalTimerBinding(binding: unknown) {
  if (binding == null || typeof binding !== 'object') {
    return false;
  }

  const bindingNodeType = (binding as { path?: { node?: { type?: unknown } } }).path?.node?.type;

  return bindingNodeType !== 'ClassMethod' && bindingNodeType !== 'ObjectMethod';
}

function applyReplacements(code: string, replacements: Replacement[]) {
  let transformed = code;
  const sortedReplacements = [...replacements].sort((a, b) => b.start - a.start || b.end - a.end);

  sortedReplacements.forEach(replacement => {
    transformed = `${transformed.slice(0, replacement.start)}${replacement.text}${transformed.slice(replacement.end)}`;
  });

  return transformed;
}

function findNextNonWhitespaceIndex(code: string, index: number) {
  while (index < code.length && isWhitespace(code[index])) {
    index += 1;
  }

  return index;
}

function isIdentifier(node: unknown): node is BabelIdentifier {
  return node != null && typeof node === 'object' && (node as { type?: unknown }).type === 'Identifier';
}

function isWhitespace(char: string | undefined) {
  return char != null && /\s/.test(char);
}
