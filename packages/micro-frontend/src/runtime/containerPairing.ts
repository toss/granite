import type { AppContainer } from './registry';

export const CONTAINER_PAIRING_KEY = 'granite.micro-frontend.container-pair' as const;

const containerPairingSymbol = Symbol.for(CONTAINER_PAIRING_KEY);
const pairedLegacyByModern = new WeakMap<AppContainer, LegacyAppContainer>();
const pairedModernByLegacy = new WeakMap<LegacyAppContainer, AppContainer>();
const legacyAdapters = new WeakSet<AppContainer>();

export interface LegacyAppContainer {
  readonly name: string;
  readonly config: unknown;
  readonly exposeMap: Record<string, unknown>;
}

export function defineContainerPair(first: object, second: object): boolean {
  try {
    if (!definePairMarker(first, second) || !definePairMarker(second, first)) {
      clearContainerPair(first, second);
      return false;
    }
  } catch (error) {
    clearContainerPair(first, second);
    throw error;
  }
  return true;
}

export function isContainerPair(first: object, second: object): boolean {
  return hasPairMarker(first, second) && hasPairMarker(second, first);
}

export function getContainerPair(container: object): object | null {
  const descriptor = Reflect.getOwnPropertyDescriptor(container, containerPairingSymbol);
  if (!isPairDescriptor(descriptor) || !isObject(descriptor.value)) {
    return null;
  }
  return hasPairMarker(descriptor.value, container) ? descriptor.value : null;
}

export function clearContainerPair(first: object, second: object): void {
  Reflect.deleteProperty(first, containerPairingSymbol);
  Reflect.deleteProperty(second, containerPairingSymbol);
}

export function rememberContainerPair(modern: AppContainer, legacy: LegacyAppContainer): void {
  pairedLegacyByModern.set(modern, legacy);
  pairedModernByLegacy.set(legacy, modern);
}

export function rememberLegacyAdapterPair(modern: AppContainer, legacy: LegacyAppContainer): void {
  rememberContainerPair(modern, legacy);
  legacyAdapters.add(modern);
}

export function getLegacyContainerPair(modern: AppContainer): LegacyAppContainer | undefined {
  const markedPair = getContainerPair(modern);
  if (isLegacyAppContainer(markedPair) && markedPair.name === modern.appName) {
    rememberContainerPair(modern, markedPair);
    return markedPair;
  }
  return legacyAdapters.has(modern) ? pairedLegacyByModern.get(modern) : undefined;
}

export function getModernContainerPair(legacy: LegacyAppContainer): AppContainer | undefined {
  return pairedModernByLegacy.get(legacy);
}

export function forgetContainerPair(modern: AppContainer | null, legacy: LegacyAppContainer | null): void {
  if (modern != null) {
    pairedLegacyByModern.delete(modern);
    legacyAdapters.delete(modern);
  }
  if (legacy != null) {
    pairedModernByLegacy.delete(legacy);
  }
}

export function isLegacyAppContainer(value: unknown): value is LegacyAppContainer {
  return (
    isObjectRecord(value) &&
    typeof Reflect.get(value, 'name') === 'string' &&
    isObjectRecord(Reflect.get(value, 'config')) &&
    isObjectRecord(Reflect.get(value, 'exposeMap'))
  );
}

function definePairMarker(container: object, pair: object): boolean {
  return Reflect.defineProperty(container, containerPairingSymbol, {
    configurable: true,
    enumerable: false,
    value: pair,
    writable: false,
  });
}

function hasPairMarker(container: object, pair: object): boolean {
  const descriptor = Reflect.getOwnPropertyDescriptor(container, containerPairingSymbol);
  return isPairDescriptor(descriptor) && Object.is(descriptor.value, pair);
}

function isPairDescriptor(descriptor: PropertyDescriptor | undefined): descriptor is PropertyDescriptor & {
  readonly value: unknown;
} {
  return (
    descriptor != null &&
    descriptor.configurable === true &&
    descriptor.enumerable === false &&
    descriptor.writable === false &&
    Reflect.has(descriptor, 'value')
  );
}

export function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}

function isObject(value: unknown): value is object {
  return (typeof value === 'object' && value != null) || typeof value === 'function';
}
