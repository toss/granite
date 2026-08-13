import { generate } from '@babel/generator';
import flowRemoveTypes from 'flow-remove-types';
import * as HermesParser from 'hermes-parser';
import { AsyncTransformStep } from '../../../../transformer/TransformPipeline';
import { defineStepName } from '../../../../utils/defineStepName';

const HERMES_PARSE_OPTIONS = { flow: 'all', babel: true } as const;

type MutableProgram = { body: unknown[] };
type ImportDeclaration = {
  importKind?: unknown;
  specifiers: unknown[];
  start?: unknown;
  type: 'ImportDeclaration';
};
type GeneratorNode = Parameters<typeof generate>[0];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMutableProgram(value: unknown): value is MutableProgram {
  return isRecord(value) && Array.isArray(value.body);
}

function isGeneratorNode(value: unknown): value is GeneratorNode {
  return isRecord(value) && typeof value.type === 'string';
}

function getProgram(ast: unknown): MutableProgram | null {
  if (!isRecord(ast) || !isMutableProgram(ast.program)) {
    return null;
  }

  return ast.program;
}

function getImportDeclaration(node: unknown): ImportDeclaration | null {
  if (!isRecord(node) || node.type !== 'ImportDeclaration' || !Array.isArray(node.specifiers)) {
    return null;
  }

  return {
    importKind: node.importKind,
    specifiers: node.specifiers,
    start: node.start,
    type: 'ImportDeclaration',
  };
}

function isTypeSpecifier(specifier: unknown) {
  if (!isRecord(specifier)) {
    return false;
  }

  return specifier.importKind === 'type' || specifier.importKind === 'typeof';
}

function collectTypeOnlyImportOffsets(code: string) {
  const ast: unknown = HermesParser.parse(code, HERMES_PARSE_OPTIONS);
  const program = getProgram(ast);
  const offsets = new Set<number>();

  if (program == null) {
    return offsets;
  }

  for (const node of program.body) {
    const declaration = getImportDeclaration(node);

    if (declaration == null || typeof declaration.start !== 'number' || declaration.specifiers.length === 0) {
      continue;
    }

    const isTypeOnly =
      declaration.importKind === 'type' ||
      declaration.importKind === 'typeof' ||
      declaration.specifiers.every(isTypeSpecifier);

    if (isTypeOnly) {
      offsets.add(declaration.start);
    }
  }

  return offsets;
}

function removeTypeOnlyImports(ast: unknown, originalCode: string) {
  const program = getProgram(ast);

  if (program == null || !originalCode.includes('type')) {
    return;
  }

  const hasEmptyImport = program.body.some((node) => {
    const declaration = getImportDeclaration(node);
    return declaration != null && declaration.specifiers.length === 0;
  });

  if (!hasEmptyImport) {
    return;
  }

  const typeOnlyOffsets = collectTypeOnlyImportOffsets(originalCode);

  if (typeOnlyOffsets.size === 0) {
    return;
  }

  program.body = program.body.filter((node) => {
    const declaration = getImportDeclaration(node);
    return !(
      declaration != null &&
      declaration.specifiers.length === 0 &&
      typeof declaration.start === 'number' &&
      typeOnlyOffsets.has(declaration.start)
    );
  });
}

export function createFlowStripStep(): AsyncTransformStep {
  const flowStripStep: AsyncTransformStep = async function flowStrip(code, args) {
    const shouldTransform = args.path.endsWith('.js') || args.path.endsWith('.jsx');

    if (!shouldTransform) {
      return { code };
    }

    try {
      const transformedCode = flowRemoveTypes(code, {});

      // @see https://flow.org/en/docs/react/component-syntax/
      // This is necessary to transform component syntax, etc.
      const parsedAst = HermesParser.parse(transformedCode.toString(), HERMES_PARSE_OPTIONS);

      removeTypeOnlyImports(parsedAst, code);

      if (!isGeneratorNode(parsedAst)) {
        return { code };
      }

      const transformedResult = generate(parsedAst);

      return { code: transformedResult?.code ?? code };
    } catch {
      return { code };
    }
  };

  defineStepName(flowStripStep, 'flow-strip');

  return flowStripStep;
}
