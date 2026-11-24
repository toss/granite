import { getMicroFrontendGlobalContext } from './globalContext';
import { instanceIdForDefinition, nextInstanceId } from './instanceIds';
import type { AppContainer } from './registry';

/**
 * Container definitions and app instances.
 *
 * A remote bundle built with `containerInit()` hands its body to the host runtime when native evaluates it
 * (`defineContainer`). The body is the container's definition: running it again makes another instance of the app,
 * a full copy of the bundle's modules (their own module state) with its own `instanceId` (`<appName>@<n>`), without
 * reading or evaluating the bundle file again. The first instance is the evaluation itself; `createContainerInstance`
 * makes the others.
 */
export interface ContainerDefinition {
  readonly appName: string;
  /** The first instance: the evaluation that defined the container. */
  readonly instanceId: string;
  readonly sourceUrl?: string;
}

export interface ContainerInstance {
  readonly appName: string;
  readonly instanceId: string;
  readonly sourceUrl?: string;
  /** The first instance, whose definition this instance ran again. */
  readonly instanceOf: string;
  readonly container: AppContainer;
}

type Definition = ContainerDefinition & { readonly run: (evaluation: object) => void; instances: number };

/** Non-enumerable entry on the global context, because older bundles validate its enumerable key set. */
const DEFINE_CONTAINER = 'defineContainer';
/** The newest definition of each app: an evaluation of a newer deployment replaces the older one. */
const definitions = new Map<string, Definition>();

export class ContainerDefinitionNotFoundError extends Error {
  readonly appName: string;

  constructor(appName: string) {
    super(
      `App '${appName}' has no container definition. Its bundle was not built with containerInit(), ` +
        'or the native runtime evaluated it without the evaluation argument.'
    );
    this.name = 'ContainerDefinitionNotFoundError';
    this.appName = appName;
  }
}

export class ContainerInstanceError extends Error {
  readonly appName: string;

  constructor(appName: string, message: string) {
    super(`Cannot make an instance of app '${appName}': ${message}`);
    this.name = 'ContainerInstanceError';
    this.appName = appName;
  }
}

export function installContainerDefinitions(): void {
  Reflect.defineProperty(getMicroFrontendGlobalContext(), DEFINE_CONTAINER, {
    configurable: true,
    enumerable: false,
    writable: false,
    value: defineContainer,
  });
}

export function defineContainer(value: unknown, run: unknown): void {
  if (value == null || typeof value !== 'object' || typeof run !== 'function') {
    return;
  }
  const appName = Reflect.get(value, 'appName');
  const sourceUrl = Reflect.get(value, 'sourceUrl');
  if (typeof appName !== 'string' || appName.length === 0) {
    return;
  }
  // The first instance's id. The same run's initContainer takes it (instanceIds.ts).
  const instanceId = instanceIdForDefinition(appName);
  definitions.set(appName, {
    appName,
    instanceId,
    sourceUrl: typeof sourceUrl === 'string' ? sourceUrl : undefined,
    run: run as Definition['run'],
    instances: 0,
  });
}

export function getContainerDefinition(appName: string): ContainerDefinition | undefined {
  const definition = definitions.get(appName);
  return definition == null
    ? undefined
    : Object.freeze({
        appName: definition.appName,
        instanceId: definition.instanceId,
        sourceUrl: definition.sourceUrl,
      });
}

/** Test and reset helper: forgets an app's definition (for example after its evaluation failed). */
export function removeContainerDefinition(appName: string): void {
  definitions.delete(appName);
}

/**
 * Runs the app's definition again and returns the new instance's container.
 *
 * The global registry holds one container per app name, and a bundle registers its container under its app name.
 * So the instance borrows the app's slot while it runs. Afterwards the registry is exactly as before, also when the
 * run throws: the slot gets the app's own container back, and the legacy containers the run pushed are removed.
 */
export function createContainerInstance(appName: string): ContainerInstance {
  const definition = definitions.get(appName);
  if (definition == null) {
    throw new ContainerDefinitionNotFoundError(appName);
  }
  const context = getMicroFrontendGlobalContext();
  const containers = context.__CONTAINERS__ as Record<string, unknown>;
  const instances = context.__INSTANCES__ as unknown[] & Record<string, unknown>;
  const saved = {
    container: Reflect.getOwnPropertyDescriptor(containers, appName),
    index: Reflect.getOwnPropertyDescriptor(instances, appName),
    length: instances.length,
  };
  definition.instances += 1;
  const instanceId = nextInstanceId(appName);
  Reflect.deleteProperty(containers, appName);
  Reflect.deleteProperty(instances, appName);
  try {
    // `evalId` is the same id under its older name, for bundles whose wrapper reads that field.
    definition.run({
      instanceId,
      evalId: instanceId,
      sourceUrl: definition.sourceUrl,
      instanceOf: definition.instanceId,
    });
    const container = containers[appName] as AppContainer | undefined;
    if (container == null || typeof container !== 'object' || container.exposedModules == null) {
      throw new ContainerInstanceError(appName, 'the run did not register its container');
    }
    return Object.freeze({
      appName,
      instanceId,
      sourceUrl: definition.sourceUrl,
      instanceOf: definition.instanceId,
      container,
    });
  } finally {
    // The run is synchronous, so everything past the old length is what it registered.
    if (instances.length > saved.length) {
      instances.splice(saved.length);
    }
    Reflect.deleteProperty(containers, appName);
    Reflect.deleteProperty(instances, appName);
    if (saved.container != null) {
      Reflect.defineProperty(containers, appName, saved.container);
    }
    if (saved.index != null) {
      Reflect.defineProperty(instances, appName, saved.index);
    }
  }
}
