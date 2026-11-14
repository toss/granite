import * as path from 'node:path';
import type { Plugin } from 'rollipop';

type PluginContext = ThisParameterType<Extract<NonNullable<Plugin['load']>, (...args: never[]) => unknown>>;
export type ExportNamesContext = Pick<PluginContext, 'load' | 'parse' | 'resolve'>;
type Program = ReturnType<ExportNamesContext['parse']>;

/** A resolved export binding. `name: '*'` is the namespace object of `module`. */
interface Binding {
  readonly module: string;
  readonly name: string;
}

interface IndirectExport {
  readonly source: string;
  readonly importName: string;
}

interface ModuleRecord {
  readonly id: string;
  readonly format: 'es' | 'other';
  /** Export names other than `export *`, as Rolldown reports them. */
  readonly names: readonly string[];
  /** `export { a } from`, `export * as a from`, and `export { a }` of an imported binding. */
  readonly indirect: ReadonlyMap<string, IndirectExport>;
  readonly starSources: readonly string[];
}

const AMBIGUOUS = Symbol('ambiguous');

class UnknownExportsError extends Error {}

/**
 * Returns the export names of an ESM module's namespace object, sorted like a module namespace.
 * Follows the ECMAScript GetExportedNames and ResolveExport steps: `export *` never re-exports `default`,
 * a name that two `export *` modules provide from different bindings is ambiguous and left out, and an
 * explicit export hides the same name from `export *`.
 * Returns null when the names cannot be found statically, for example when an `export *` reaches a
 * CommonJS module.
 */
export async function getNamespaceExportNames(context: ExportNamesContext, id: string): Promise<string[] | null> {
  const records = new Map<string, Promise<ModuleRecord>>();
  const resolved = new Map<string, Promise<string>>();

  const record = (moduleId: string) => {
    let pending = records.get(moduleId);
    if (pending == null) {
      pending = parseModuleRecord(context, moduleId);
      records.set(moduleId, pending);
    }
    return pending;
  };
  const resolve = (source: string, importer: string) => {
    const key = `${importer}\0${source}`;
    let pending = resolved.get(key);
    if (pending == null) {
      pending = context.resolve(source, importer).then((result) => {
        if (result == null || result.external) {
          throw new UnknownExportsError(`Cannot resolve '${source}' from '${importer}'`);
        }
        return result.id;
      });
      resolved.set(key, pending);
    }
    return pending;
  };

  async function getExportedNames(moduleId: string, exportStarSet: Set<string>): Promise<string[]> {
    if (exportStarSet.has(moduleId)) {
      return [];
    }
    exportStarSet.add(moduleId);
    const module = await record(moduleId);
    if (module.format !== 'es') {
      throw new UnknownExportsError(`'${moduleId}' is not an ES module`);
    }
    const names = [...module.names];
    for (const source of module.starSources) {
      for (const name of await getExportedNames(await resolve(source, moduleId), exportStarSet)) {
        if (name !== 'default') {
          names.push(name);
        }
      }
    }
    return names;
  }

  async function resolveExport(
    moduleId: string,
    exportName: string,
    resolveSet: Array<{ readonly module: string; readonly name: string }>
  ): Promise<Binding | null | typeof AMBIGUOUS> {
    if (resolveSet.some((entry) => entry.module === moduleId && entry.name === exportName)) {
      // A circular import request.
      return null;
    }
    resolveSet.push({ module: moduleId, name: exportName });
    const module = await record(moduleId);
    if (module.format !== 'es') {
      // A CommonJS export has no binding to follow; the module and name identify it.
      return { module: moduleId, name: exportName };
    }
    const indirect = module.indirect.get(exportName);
    if (indirect != null) {
      const importedModule = await resolve(indirect.source, moduleId);
      return indirect.importName === '*'
        ? { module: importedModule, name: '*' }
        : resolveExport(importedModule, indirect.importName, resolveSet);
    }
    if (module.names.includes(exportName)) {
      return { module: moduleId, name: exportName };
    }
    if (exportName === 'default') {
      return null;
    }
    let starResolution: Binding | null = null;
    for (const source of module.starSources) {
      const resolution = await resolveExport(await resolve(source, moduleId), exportName, resolveSet);
      if (resolution === AMBIGUOUS) {
        return AMBIGUOUS;
      }
      if (resolution == null) {
        continue;
      }
      if (starResolution == null) {
        starResolution = resolution;
      } else if (starResolution.module !== resolution.module || starResolution.name !== resolution.name) {
        return AMBIGUOUS;
      }
    }
    return starResolution;
  }

  try {
    const names = [...new Set(await getExportedNames(id, new Set()))];
    const unambiguous: string[] = [];
    for (const name of names) {
      const resolution = await resolveExport(id, name, []);
      if (resolution != null && resolution !== AMBIGUOUS) {
        unambiguous.push(name);
      }
    }
    // Module namespace keys are sorted by code unit order, which is what Array#sort does for strings.
    return unambiguous.sort();
  } catch (error) {
    if (error instanceof UnknownExportsError) {
      return null;
    }
    throw error;
  }
}

async function parseModuleRecord(context: ExportNamesContext, id: string): Promise<ModuleRecord> {
  const info = await context.load({ id });
  if (info.inputFormat !== 'es') {
    return { id, format: 'other', names: [], indirect: new Map(), starSources: [] };
  }
  if (info.code == null) {
    throw new UnknownExportsError(`'${id}' has no code`);
  }
  let program: Program;
  try {
    program = context.parse(info.code, { lang: parserLanguage(id) });
  } catch {
    throw new UnknownExportsError(`Cannot parse '${id}'`);
  }

  const imports = new Map<string, IndirectExport>();
  for (const node of program.body) {
    if (node.type !== 'ImportDeclaration' || node.importKind === 'type') {
      continue;
    }
    for (const specifier of node.specifiers) {
      if (specifier.type === 'ImportSpecifier') {
        if (specifier.importKind !== 'type') {
          imports.set(specifier.local.name, { source: node.source.value, importName: nameOf(specifier.imported) });
        }
      } else {
        imports.set(specifier.local.name, {
          source: node.source.value,
          importName: specifier.type === 'ImportDefaultSpecifier' ? 'default' : '*',
        });
      }
    }
  }

  const indirect = new Map<string, IndirectExport>();
  const starSources: string[] = [];
  for (const node of program.body) {
    if (node.type === 'ExportAllDeclaration') {
      if (node.exportKind === 'type') {
        continue;
      }
      if (node.exported == null) {
        starSources.push(node.source.value);
      } else {
        indirect.set(nameOf(node.exported), { source: node.source.value, importName: '*' });
      }
    } else if (node.type === 'ExportNamedDeclaration' && node.exportKind !== 'type') {
      for (const specifier of node.specifiers) {
        if (specifier.exportKind === 'type') {
          continue;
        }
        const exportName = nameOf(specifier.exported);
        const localName = nameOf(specifier.local);
        if (node.source != null) {
          indirect.set(exportName, { source: node.source.value, importName: localName });
        } else {
          const imported = imports.get(localName);
          if (imported != null) {
            indirect.set(exportName, imported);
          }
        }
      }
    }
  }

  return { id, format: 'es', names: info.exports.filter((name) => name !== '*'), indirect, starSources };
}

function nameOf(node: { type: string; name?: string; value?: unknown }): string {
  return node.type === 'Identifier' ? String(node.name) : String(node.value);
}

function parserLanguage(id: string): 'js' | 'jsx' | 'ts' | 'tsx' {
  const extension = path.extname(id.split('?')[0] ?? id);
  if (extension === '.ts' || extension === '.mts' || extension === '.cts') {
    return 'ts';
  }
  if (extension === '.tsx') {
    return 'tsx';
  }
  return 'jsx';
}
