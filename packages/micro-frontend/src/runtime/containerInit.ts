import { getMicroFrontendGlobalContext } from './globalContext';

/**
 * One evaluation of a remote bundle. A bundle built with `containerInit()` receives its identity from the
 * native evaluator as an argument (`evalId` is minted per evaluation), so evaluating the same app twice
 * yields two containers.
 */
export interface MicroFrontendContainer {
  readonly evalId: string;
  readonly appName: string;
  readonly sourceUrl?: string;
}

/** Shared modules as one container sees them. `get` is called lazily, on the container's first use. */
export interface MicroFrontendShareScope {
  readonly get: (moduleName: string) => unknown;
}

export interface BeforeInitContainerArgs {
  readonly container: MicroFrontendContainer;
  /** The host's share scope. Delegate to it for modules the hook does not replace. */
  readonly shareScope: MicroFrontendShareScope;
}

export interface BeforeInitContainerResult {
  /** The share scope this container uses instead of the host's. */
  readonly shareScope?: MicroFrontendShareScope;
}

/**
 * Like Module Federation's `beforeInitContainer`: runs once per container, before its code runs, and may
 * give that container its own view of the shared modules.
 */
export type BeforeInitContainerHook = (args: BeforeInitContainerArgs) => BeforeInitContainerResult | void;

/**
 * Granite-owned entry the `containerInit()` wrapper calls. Non-enumerable because older bundles validate the
 * enumerable key set of the global context.
 */
const INIT_CONTAINER = 'initContainer';

function hostShareScope(): MicroFrontendShareScope {
  return Object.freeze({
    get(moduleName: string) {
      const shared = getMicroFrontendGlobalContext().__SHARED__[moduleName];
      if (shared == null) {
        throw new Error(`Shared module ${moduleName} is not registered`);
      }
      return shared.get();
    },
  });
}

function toContainer(value: unknown): MicroFrontendContainer | undefined {
  if (value == null || typeof value !== 'object') {
    return undefined;
  }
  const evalId = Reflect.get(value, 'evalId');
  const appName = Reflect.get(value, 'appName');
  const sourceUrl = Reflect.get(value, 'sourceUrl');
  if (typeof evalId !== 'string' || evalId.length === 0 || typeof appName !== 'string' || appName.length === 0) {
    return undefined;
  }
  return Object.freeze({ evalId, appName, sourceUrl: typeof sourceUrl === 'string' ? sourceUrl : undefined });
}

/** Installs (or clears) the host's hook. Without a hook every container uses the host's share scope. */
export function installContainerInit(hook: BeforeInitContainerHook | undefined): void {
  const context = getMicroFrontendGlobalContext();
  Reflect.defineProperty(context, INIT_CONTAINER, {
    configurable: true,
    enumerable: false,
    writable: false,
    value: (value: unknown): MicroFrontendShareScope | undefined => initContainer(value, hook),
  });
}

export function initContainer(
  value: unknown,
  hook: BeforeInitContainerHook | undefined
): MicroFrontendShareScope | undefined {
  const container = toContainer(value);
  if (container == null) {
    // Not an evaluation argument from a known native evaluator: behave exactly like an unwrapped bundle.
    return undefined;
  }
  const shareScope = hostShareScope();
  const result = hook?.({ container, shareScope });
  return result?.shareScope ?? shareScope;
}
