const CANONICAL_GLOBAL_KEY = '__MICRO_FRONTEND__';
const COMPATIBILITY_GLOBAL_KEY = '_graniteMicroFrontend';
type Registry = Record<string, unknown>;
type RegistryAdoption = readonly [Registry, readonly (readonly [string, unknown])[]];

export type MicroFrontendGlobalContext = {
  readonly __INSTANCES__: unknown[];
  readonly __SHARED__: Registry;
  readonly __CONTAINERS__: Registry;
};

type LegacyGlobalContext = {
  readonly __INSTANCES__: unknown[];
  readonly __SHARED__: Registry;
};

type CompatibilityContext = {
  readonly containers: Registry;
  readonly sharedModules: Registry;
};

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

export function getMicroFrontendGlobalContext(globalObject: object = globalThis): MicroFrontendGlobalContext {
  const canonicalValue: unknown = Reflect.get(globalObject, CANONICAL_GLOBAL_KEY);
  const compatibilityValue: unknown = Reflect.get(globalObject, COMPATIBILITY_GLOBAL_KEY);
  const installedContext = isObjectRecord(compatibilityValue) ? installedContexts.get(compatibilityValue) : undefined;

  if (installedContext != null) {
    if (Object.is(installedContext, canonicalValue)) {
      return installedContext;
    }
    throw new MicroFrontendGlobalContextCompatibilityError('canonical-global-is-not-adoptable');
  }

  const canonicalContext = parseCanonicalContext(canonicalValue);
  const compatibilityContext = parseCompatibilityContext(compatibilityValue);
  const canonicalNeedsReplacement =
    isLegacyGlobalContext(canonicalContext) && !hasKeysInOrder(canonicalContext, ['__INSTANCES__', '__SHARED__']);
  validateGlobalSlots(globalObject, canonicalValue, canonicalNeedsReplacement);

  const adoptedContext = canonicalContext ?? createCanonicalContext(compatibilityContext);
  const canonicalContainers = isMicroFrontendGlobalContext(adoptedContext) ? adoptedContext.__CONTAINERS__ : {};
  const adapter = selectCompatibilityAdapter(canonicalContainers, adoptedContext.__SHARED__, compatibilityContext);
  const pendingSharedEntries = getPendingEntries(adoptedContext.__SHARED__, compatibilityContext?.sharedModules);
  const pendingContainerEntries = getPendingEntries(canonicalContainers, compatibilityContext?.containers);

  const context = completeCanonicalContext(adoptedContext, canonicalContainers);
  installCanonicalOwner(globalObject, canonicalValue, context);
  applyPendingEntries([
    [context.__SHARED__, pendingSharedEntries],
    [context.__CONTAINERS__, pendingContainerEntries],
  ]);
  installCompatibilityAdapter(globalObject, adapter);
  installedContexts.set(adapter, context);

  return context;
}

function parseCanonicalContext(value: unknown): MicroFrontendGlobalContext | LegacyGlobalContext | null {
  if (value == null) {
    return null;
  }
  if (isMicroFrontendGlobalContext(value) || isLegacyGlobalContext(value)) {
    return value;
  }
  throw new MicroFrontendGlobalContextCompatibilityError('canonical-global-is-not-adoptable');
}

function parseCompatibilityContext(value: unknown): CompatibilityContext | null {
  if (value == null) {
    return null;
  }
  if (isCompatibilityContext(value)) {
    return value;
  }
  throw new MicroFrontendGlobalContextCompatibilityError('compatibility-global-is-not-adoptable');
}

function validateGlobalSlots(globalObject: object, canonicalValue: unknown, canonicalNeedsReplacement: boolean): void {
  const canonicalDescriptor = Object.getOwnPropertyDescriptor(globalObject, CANONICAL_GLOBAL_KEY);
  const compatibilityDescriptor = Object.getOwnPropertyDescriptor(globalObject, COMPATIBILITY_GLOBAL_KEY);
  if ((canonicalDescriptor == null || compatibilityDescriptor == null) && !Reflect.isExtensible(globalObject)) {
    throw new MicroFrontendGlobalContextCompatibilityError('global-object-is-not-extensible');
  }
  if (
    canonicalDescriptor != null &&
    (canonicalValue == null || canonicalNeedsReplacement) &&
    canonicalDescriptor.configurable !== true
  ) {
    throw new MicroFrontendGlobalContextCompatibilityError('canonical-global-is-locked');
  }
  if (compatibilityDescriptor != null && compatibilityDescriptor.configurable !== true) {
    throw new MicroFrontendGlobalContextCompatibilityError('compatibility-global-is-locked');
  }
}

function createCanonicalContext(compatibilityContext: CompatibilityContext | null): MicroFrontendGlobalContext {
  return {
    __INSTANCES__: [],
    __SHARED__: compatibilityContext?.sharedModules ?? {},
    __CONTAINERS__: compatibilityContext?.containers ?? {},
  };
}

function selectCompatibilityAdapter(
  containers: Registry,
  sharedModules: Registry,
  compatibilityContext: CompatibilityContext | null
): CompatibilityContext {
  if (
    compatibilityContext != null &&
    Object.is(compatibilityContext.containers, containers) &&
    Object.is(compatibilityContext.sharedModules, sharedModules)
  ) {
    return compatibilityContext;
  }
  return { containers, sharedModules };
}

function getPendingEntries(target: Registry, source: Registry | undefined): readonly (readonly [string, unknown])[] {
  if (source == null || Object.is(target, source)) {
    return [];
  }
  const pendingEntries: Array<readonly [string, unknown]> = [];
  for (const key of Object.keys(source)) {
    const sourceValue: unknown = Reflect.get(source, key);
    if (Reflect.has(target, key)) {
      if (!Object.is(Reflect.get(target, key), sourceValue)) {
        throw new MicroFrontendGlobalContextCompatibilityError('registry-entry-conflict');
      }
      continue;
    }
    pendingEntries.push([key, sourceValue]);
  }
  if (pendingEntries.length > 0 && !Reflect.isExtensible(target)) {
    throw new MicroFrontendGlobalContextCompatibilityError('registry-is-not-extensible');
  }
  return pendingEntries;
}

function applyPendingEntries(adoptions: readonly RegistryAdoption[]): void {
  const attemptedEntries: Array<readonly [Registry, string]> = [];
  try {
    for (const [target, entries] of adoptions) {
      for (const [key, value] of entries) {
        attemptedEntries.push([target, key]);
        if (!Reflect.set(target, key, value)) {
          throw new MicroFrontendGlobalContextCompatibilityError('registry-is-not-extensible');
        }
      }
    }
  } catch (error) {
    attemptedEntries.reverse().forEach(([target, key]) => Reflect.deleteProperty(target, key));
    throw error;
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
  Reflect.defineProperty(globalObject, CANONICAL_GLOBAL_KEY, {
    configurable: true,
    enumerable: true,
    value: context,
    writable: true,
  });
}

function installCompatibilityAdapter(globalObject: object, adapter: CompatibilityContext): void {
  Reflect.defineProperty(globalObject, COMPATIBILITY_GLOBAL_KEY, {
    configurable: true,
    enumerable: true,
    get: () => adapter,
    set: (nextValue: unknown) => {
      if (!Object.is(nextValue, adapter)) {
        throw new MicroFrontendGlobalContextCompatibilityError('compatibility-global-is-not-adoptable');
      }
    },
  });
}

function defineCanonicalContainers(context: LegacyGlobalContext, containers: Registry): MicroFrontendGlobalContext {
  if (!Reflect.isExtensible(context)) {
    throw new MicroFrontendGlobalContextCompatibilityError('canonical-global-is-not-adoptable');
  }
  Reflect.defineProperty(context, '__CONTAINERS__', {
    configurable: true,
    enumerable: true,
    value: containers,
    writable: true,
  });
  if (!isMicroFrontendGlobalContext(context)) {
    throw new MicroFrontendGlobalContextCompatibilityError('canonical-global-is-not-adoptable');
  }
  return context;
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

function isObjectRecord(value: unknown): value is Registry {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}

function hasExactKeySet(value: object, expectedKeys: readonly string[]): boolean {
  const actualKeys = Object.keys(value);
  return actualKeys.length === expectedKeys.length && expectedKeys.every((key) => actualKeys.includes(key));
}

function hasKeysInOrder(value: object, expectedKeys: readonly string[]): boolean {
  const actualKeys = Object.keys(value);
  return actualKeys.length === expectedKeys.length && actualKeys.every((key, index) => key === expectedKeys[index]);
}
