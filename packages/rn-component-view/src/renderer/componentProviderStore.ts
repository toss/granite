import type { ComponentProvider } from 'react-native';

export interface RecordedComponentProvider {
  readonly componentProvider: ComponentProvider;
  /** Grows with every registration, so a component registered again under the same name gets a new key. */
  readonly registrationKey: number;
}

interface ComponentProviderStore {
  readonly providers: Map<string, RecordedComponentProvider>;
  readonly listeners: Set<() => void>;
  nextRegistrationKey: number;
  isRecorderInstalled: boolean;
}

// Kept on the global object so every copy of this package in a JavaScript runtime shares one record.
const COMPONENT_PROVIDER_STORE = Symbol.for('granite.rnComponentView.componentProviders');

function getStore(): ComponentProviderStore {
  const existingStore: ComponentProviderStore | undefined = Reflect.get(globalThis, COMPONENT_PROVIDER_STORE);
  if (existingStore != null) {
    return existingStore;
  }
  const store: ComponentProviderStore = {
    providers: new Map(),
    listeners: new Set(),
    nextRegistrationKey: 0,
    isRecorderInstalled: false,
  };
  Reflect.set(globalThis, COMPONENT_PROVIDER_STORE, store);
  return store;
}

export function recordComponentProvider(componentName: string, componentProvider: ComponentProvider): void {
  const store = getStore();
  store.providers.set(componentName, { componentProvider, registrationKey: store.nextRegistrationKey });
  store.nextRegistrationKey += 1;
  store.listeners.forEach((listener) => listener());
}

export function getRecordedComponentProvider(componentName: string): RecordedComponentProvider | undefined {
  return getStore().providers.get(componentName);
}

export function subscribeRecordedComponentProviders(listener: () => void): () => void {
  const { listeners } = getStore();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isComponentProviderRecorderInstalled(): boolean {
  return getStore().isRecorderInstalled;
}

export function markComponentProviderRecorderInstalled(): void {
  getStore().isRecorderInstalled = true;
}

/** @internal */
export function resetComponentProviderStoreForTest(): void {
  Reflect.deleteProperty(globalThis, COMPONENT_PROVIDER_STORE);
}
