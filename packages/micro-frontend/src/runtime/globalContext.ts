import type { AppContainer } from './registry';

const CANONICAL_GLOBAL_KEY = '__MICRO_FRONTEND__';
type ObjectRecord = Record<string, unknown>;
type SharedModule = {
  readonly get: () => unknown;
  readonly loaded: boolean;
};

export type MicroFrontendGlobalContext = {
  readonly __INSTANCES__: unknown[];
  readonly __SHARED__: Record<string, SharedModule>;
  readonly __CONTAINERS__: Record<string, AppContainer>;
};

type LegacyGlobalContext = {
  readonly __INSTANCES__: unknown[];
  readonly __SHARED__: Record<string, SharedModule>;
};

type CompatibilityFailureReason =
  | 'canonical-global-is-not-adoptable'
  | 'canonical-global-is-locked'
  | 'global-object-is-not-extensible'
  | 'registry-is-not-extensible';

export class MicroFrontendGlobalContextCompatibilityError extends Error {
  public readonly reason: CompatibilityFailureReason;

  public constructor(reason: CompatibilityFailureReason) {
    super(`Cannot establish the micro-frontend global context: ${reason}`);
    this.name = 'MicroFrontendGlobalContextCompatibilityError';
    this.reason = reason;
  }
}

function assertCompatible(condition: boolean, reason: CompatibilityFailureReason): asserts condition {
  if (!condition) {
    throw new MicroFrontendGlobalContextCompatibilityError(reason);
  }
}

export function getMicroFrontendGlobalContext(globalObject: object = globalThis): MicroFrontendGlobalContext {
  const canonicalValue: unknown = Reflect.get(globalObject, CANONICAL_GLOBAL_KEY);
  assertCompatible(
    canonicalValue == null || isMicroFrontendGlobalContext(canonicalValue) || isLegacyGlobalContext(canonicalValue),
    'canonical-global-is-not-adoptable'
  );

  if (isMicroFrontendGlobalContext(canonicalValue)) {
    return canonicalValue;
  }

  const canonicalDescriptor = Object.getOwnPropertyDescriptor(globalObject, CANONICAL_GLOBAL_KEY);
  const legacyHasCanonicalOrder =
    isLegacyGlobalContext(canonicalValue) && hasKeysInOrder(canonicalValue, ['__INSTANCES__', '__SHARED__']);

  assertCompatible(
    canonicalDescriptor != null || Reflect.isExtensible(globalObject),
    'global-object-is-not-extensible'
  );
  assertCompatible(
    canonicalDescriptor == null || legacyHasCanonicalOrder || canonicalDescriptor.configurable === true,
    'canonical-global-is-locked'
  );

  if (legacyHasCanonicalOrder) {
    return addContainersRegistry(canonicalValue);
  }

  const context: MicroFrontendGlobalContext = {
    __INSTANCES__: canonicalValue?.__INSTANCES__ ?? [],
    __SHARED__: canonicalValue?.__SHARED__ ?? {},
    __CONTAINERS__: {},
  };

  try {
    assertCompatible(
      Reflect.defineProperty(globalObject, CANONICAL_GLOBAL_KEY, {
        configurable: true,
        enumerable: true,
        value: context,
        writable: true,
      }),
      'canonical-global-is-not-adoptable'
    );
    return context;
  } catch (error) {
    restoreProperty(globalObject, CANONICAL_GLOBAL_KEY, canonicalDescriptor);
    throw error;
  }
}

function addContainersRegistry(context: LegacyGlobalContext): MicroFrontendGlobalContext {
  const containersDescriptor = Object.getOwnPropertyDescriptor(context, '__CONTAINERS__');
  assertCompatible(Reflect.isExtensible(context), 'canonical-global-is-not-adoptable');

  try {
    assertCompatible(
      Reflect.defineProperty(context, '__CONTAINERS__', {
        configurable: true,
        enumerable: true,
        value: {},
        writable: true,
      }),
      'canonical-global-is-not-adoptable'
    );
    assertCompatible(isMicroFrontendGlobalContext(context), 'canonical-global-is-not-adoptable');
    return context;
  } catch (error) {
    restoreProperty(context, '__CONTAINERS__', containersDescriptor);
    throw error;
  }
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

const isObjectRecord = (value: unknown): value is ObjectRecord =>
  typeof value === 'object' && value != null && !Array.isArray(value);

function hasExactKeySet(value: object, expectedKeys: readonly string[]): boolean {
  const actualKeys = Object.keys(value);
  return actualKeys.length === expectedKeys.length && expectedKeys.every((key) => actualKeys.includes(key));
}

function hasKeysInOrder(value: object, expectedKeys: readonly string[]): boolean {
  const actualKeys = Object.keys(value);
  return actualKeys.length === expectedKeys.length && actualKeys.every((key, index) => key === expectedKeys[index]);
}
