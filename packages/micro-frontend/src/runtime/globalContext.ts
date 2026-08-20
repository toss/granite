const CANONICAL_GLOBAL_KEY = '__MICRO_FRONTEND__';
const COMPATIBILITY_GLOBAL_KEY = '_graniteMicroFrontend';
type Registry = Record<string, unknown>;
type RegistryAdoption = readonly [Registry, readonly (readonly [string, unknown])[]];

export type MicroFrontendGlobalContext = {
  readonly __INSTANCES__: unknown[];
  readonly __SHARED__: Registry;
  readonly __CONTAINERS__: Registry;
};

type LegacyGlobalContext = { readonly __INSTANCES__: unknown[]; readonly __SHARED__: Registry };
type CompatibilityContext = { readonly containers: Registry; readonly sharedModules: Registry };

type CompatibilityFailureReason =
  | 'canonical-global-is-not-adoptable'
  | 'canonical-global-is-locked'
  | 'compatibility-global-is-not-adoptable'
  | 'compatibility-global-is-locked'
  | 'global-object-is-not-extensible'
  | 'registry-entry-conflict'
  | 'registry-is-not-extensible';

export class MicroFrontendGlobalContextCompatibilityError extends Error {
  public readonly reason: CompatibilityFailureReason;

  public constructor(reason: CompatibilityFailureReason) {
    super(`Cannot establish the micro-frontend global context: ${reason}`);
    this.name = 'MicroFrontendGlobalContextCompatibilityError';
    this.reason = reason;
  }
}

const installedContexts = new WeakMap<object, MicroFrontendGlobalContext>();

function assertCompatible(condition: boolean, reason: CompatibilityFailureReason): asserts condition {
  if (!condition) {
    throw new MicroFrontendGlobalContextCompatibilityError(reason);
  }
}

export function getMicroFrontendGlobalContext(globalObject: object = globalThis): MicroFrontendGlobalContext {
  const canonicalValue: unknown = Reflect.get(globalObject, CANONICAL_GLOBAL_KEY);
  const compatibilityValue: unknown = Reflect.get(globalObject, COMPATIBILITY_GLOBAL_KEY);
  const installedContext = isObjectRecord(compatibilityValue) ? installedContexts.get(compatibilityValue) : undefined;

  if (installedContext != null) {
    assertCompatible(Object.is(installedContext, canonicalValue), 'canonical-global-is-not-adoptable');
    return installedContext;
  }

  assertCompatible(
    canonicalValue == null || isMicroFrontendGlobalContext(canonicalValue) || isLegacyGlobalContext(canonicalValue),
    'canonical-global-is-not-adoptable'
  );
  const canonicalContext = canonicalValue;
  assertCompatible(
    compatibilityValue == null || isCompatibilityContext(compatibilityValue),
    'compatibility-global-is-not-adoptable'
  );
  const compatibilityContext = compatibilityValue;
  const canonicalNeedsReplacement =
    isLegacyGlobalContext(canonicalContext) && !hasKeysInOrder(canonicalContext, ['__INSTANCES__', '__SHARED__']);
  validateGlobalSlots(globalObject, canonicalValue, canonicalNeedsReplacement);

  const adoptedContext = canonicalContext ?? {
    __INSTANCES__: [],
    __SHARED__: compatibilityContext?.sharedModules ?? {},
    __CONTAINERS__: compatibilityContext?.containers ?? {},
  };
  const canonicalContainers = isMicroFrontendGlobalContext(adoptedContext) ? adoptedContext.__CONTAINERS__ : {};
  const adapter =
    compatibilityContext != null &&
    Object.is(compatibilityContext.containers, canonicalContainers) &&
    Object.is(compatibilityContext.sharedModules, adoptedContext.__SHARED__)
      ? compatibilityContext
      : { containers: canonicalContainers, sharedModules: adoptedContext.__SHARED__ };
  const pendingSharedEntries = getPendingEntries(adoptedContext.__SHARED__, compatibilityContext?.sharedModules);
  const pendingContainerEntries = getPendingEntries(canonicalContainers, compatibilityContext?.containers);
  const canonicalDescriptor = Object.getOwnPropertyDescriptor(globalObject, CANONICAL_GLOBAL_KEY);
  const compatibilityDescriptor = Object.getOwnPropertyDescriptor(globalObject, COMPATIBILITY_GLOBAL_KEY);
  const containersDescriptor = Object.getOwnPropertyDescriptor(adoptedContext, '__CONTAINERS__');
  const attemptedEntries: Array<readonly [Registry, string]> = [];

  try {
    const context = completeCanonicalContext(adoptedContext, canonicalContainers);
    installCanonicalOwner(globalObject, canonicalValue, context);
    applyPendingEntries(
      [
        [context.__SHARED__, pendingSharedEntries],
        [context.__CONTAINERS__, pendingContainerEntries],
      ],
      attemptedEntries
    );
    installCompatibilityAdapter(globalObject, adapter);
    installedContexts.set(adapter, context);
    return context;
  } catch (error) {
    attemptedEntries.reverse().forEach(([target, key]) => Reflect.deleteProperty(target, key));
    restoreProperty(globalObject, COMPATIBILITY_GLOBAL_KEY, compatibilityDescriptor);
    restoreProperty(globalObject, CANONICAL_GLOBAL_KEY, canonicalDescriptor);
    restoreProperty(adoptedContext, '__CONTAINERS__', containersDescriptor);
    throw error;
  }
}

function validateGlobalSlots(globalObject: object, canonicalValue: unknown, canonicalNeedsReplacement: boolean): void {
  const canonicalDescriptor = Object.getOwnPropertyDescriptor(globalObject, CANONICAL_GLOBAL_KEY);
  const compatibilityDescriptor = Object.getOwnPropertyDescriptor(globalObject, COMPATIBILITY_GLOBAL_KEY);
  assertCompatible(
    (canonicalDescriptor != null && compatibilityDescriptor != null) || Reflect.isExtensible(globalObject),
    'global-object-is-not-extensible'
  );
  assertCompatible(
    canonicalDescriptor == null ||
      (canonicalValue != null && !canonicalNeedsReplacement) ||
      canonicalDescriptor.configurable === true,
    'canonical-global-is-locked'
  );
  assertCompatible(
    compatibilityDescriptor == null || compatibilityDescriptor.configurable === true,
    'compatibility-global-is-locked'
  );
}

function getPendingEntries(target: Registry, source: Registry | undefined): readonly (readonly [string, unknown])[] {
  if (source == null || Object.is(target, source)) {
    return [];
  }
  const pendingEntries: Array<readonly [string, unknown]> = [];
  for (const key of Object.keys(source)) {
    const sourceValue: unknown = Reflect.get(source, key);
    if (Reflect.has(target, key)) {
      assertCompatible(Object.is(Reflect.get(target, key), sourceValue), 'registry-entry-conflict');
      continue;
    }
    pendingEntries.push([key, sourceValue]);
  }
  assertCompatible(pendingEntries.length === 0 || Reflect.isExtensible(target), 'registry-is-not-extensible');
  return pendingEntries;
}

function applyPendingEntries(
  adoptions: readonly RegistryAdoption[],
  attemptedEntries: Array<readonly [Registry, string]>
): void {
  for (const [target, entries] of adoptions) {
    for (const [key, value] of entries) {
      attemptedEntries.push([target, key]);
      assertCompatible(Reflect.set(target, key, value), 'registry-is-not-extensible');
    }
  }
}

function installCanonicalOwner(
  globalObject: object,
  canonicalValue: unknown,
  context: MicroFrontendGlobalContext
): void {
  if (Object.is(canonicalValue, context)) {
    return;
  }
  assertCompatible(
    Reflect.defineProperty(globalObject, CANONICAL_GLOBAL_KEY, {
      configurable: true,
      enumerable: true,
      value: context,
      writable: true,
    }),
    'canonical-global-is-not-adoptable'
  );
}

function installCompatibilityAdapter(globalObject: object, adapter: CompatibilityContext): void {
  assertCompatible(
    Reflect.defineProperty(globalObject, COMPATIBILITY_GLOBAL_KEY, {
      configurable: true,
      enumerable: true,
      get: () => adapter,
      set: (nextValue: unknown) => {
        if (!Object.is(nextValue, adapter)) {
          throw new MicroFrontendGlobalContextCompatibilityError('compatibility-global-is-not-adoptable');
        }
      },
    }),
    'compatibility-global-is-not-adoptable'
  );
}

function defineCanonicalContainers(context: LegacyGlobalContext, containers: Registry): MicroFrontendGlobalContext {
  assertCompatible(Reflect.isExtensible(context), 'canonical-global-is-not-adoptable');
  assertCompatible(
    Reflect.defineProperty(context, '__CONTAINERS__', {
      configurable: true,
      enumerable: true,
      value: containers,
      writable: true,
    }),
    'canonical-global-is-not-adoptable'
  );
  assertCompatible(isMicroFrontendGlobalContext(context), 'canonical-global-is-not-adoptable');
  return context;
}

function restoreProperty(target: object, key: PropertyKey, descriptor: PropertyDescriptor | undefined): void {
  const current = Object.getOwnPropertyDescriptor(target, key) ?? {};
  const previous = descriptor ?? {};
  const currentKeys = Object.keys(current);
  const descriptorsMatch =
    currentKeys.length === Object.keys(previous).length &&
    currentKeys.every((property) => Object.is(Reflect.get(current, property), Reflect.get(previous, property)));
  if (descriptorsMatch) {
    return;
  }
  assertCompatible(
    descriptor == null ? Reflect.deleteProperty(target, key) : Reflect.defineProperty(target, key, descriptor),
    'canonical-global-is-not-adoptable'
  );
}

function completeCanonicalContext(
  context: MicroFrontendGlobalContext | LegacyGlobalContext,
  containers: Registry
): MicroFrontendGlobalContext {
  if (isMicroFrontendGlobalContext(context)) {
    return context;
  }
  if (hasKeysInOrder(context, ['__INSTANCES__', '__SHARED__'])) {
    return defineCanonicalContainers(context, containers);
  }
  return {
    __INSTANCES__: context.__INSTANCES__,
    __SHARED__: context.__SHARED__,
    __CONTAINERS__: containers,
  };
}

function isMicroFrontendGlobalContext(value: unknown): value is MicroFrontendGlobalContext {
  return (
    isObjectRecord(value) &&
    hasKeysInOrder(value, ['__INSTANCES__', '__SHARED__', '__CONTAINERS__']) &&
    Array.isArray(Reflect.get(value, '__INSTANCES__')) &&
    isObjectRecord(Reflect.get(value, '__SHARED__')) &&
    isObjectRecord(Reflect.get(value, '__CONTAINERS__'))
  );
}

function isLegacyGlobalContext(value: unknown): value is LegacyGlobalContext {
  return (
    isObjectRecord(value) &&
    hasExactKeySet(value, ['__INSTANCES__', '__SHARED__']) &&
    Array.isArray(Reflect.get(value, '__INSTANCES__')) &&
    isObjectRecord(Reflect.get(value, '__SHARED__'))
  );
}

function isCompatibilityContext(value: unknown): value is CompatibilityContext {
  return (
    isObjectRecord(value) &&
    isObjectRecord(Reflect.get(value, 'containers')) &&
    isObjectRecord(Reflect.get(value, 'sharedModules'))
  );
}

const isObjectRecord = (value: unknown): value is Registry =>
  typeof value === 'object' && value != null && !Array.isArray(value);

function hasExactKeySet(value: object, expectedKeys: readonly string[]): boolean {
  const actualKeys = Object.keys(value);
  return actualKeys.length === expectedKeys.length && expectedKeys.every((key) => actualKeys.includes(key));
}

function hasKeysInOrder(value: object, expectedKeys: readonly string[]): boolean {
  const actualKeys = Object.keys(value);
  return actualKeys.length === expectedKeys.length && actualKeys.every((key, index) => key === expectedKeys[index]);
}
