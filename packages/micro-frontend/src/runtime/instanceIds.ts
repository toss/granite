import type { MicroFrontendBundle } from '../types';

/**
 * Instance ids: `<appName>@<n>` by default, numbered per app by this runtime, e.g. `shopping@1`, `shopping@2`. The
 * host can format them itself (`createMicroFrontendRuntime({ formatInstanceId })`), for example to add what its
 * bundle loader reported about the bundle (a deployment id). Every id must be unique in the runtime; a formatted id
 * that is not falls back to the default.
 *
 * An app instance is one copy of an app's modules: the bundle's first evaluation, which native runs, or an instance
 * made from the app's container definition. The JavaScript runtime issues every id: native does not know the app
 * name, so it cannot number per app, and two issuers would hand out the same number (a new deployment evaluated by
 * native after instances made here). Native only passes `{ sourceUrl }`; an `evalId` that older native evaluators
 * still pass is ignored.
 *
 * An instance id names one copy for routing. It is not a security boundary.
 */
export interface MicroFrontendInstanceIdInfo {
  readonly appName: string;
  /** 1, 2, 3… per app, in the order this runtime issues ids. */
  readonly sequence: number;
  /**
   * What the adapter's `loadBundle` returned for the evaluation that defined the instance's container (every
   * instance made from that definition gets the same bundle). Undefined when the app was evaluated without the
   * adapter (`runtime.evaluateScript`).
   */
  readonly bundle?: MicroFrontendBundle;
}

export type FormatInstanceId = (info: MicroFrontendInstanceIdInfo) => string;

const defaultFormat: FormatInstanceId = ({ appName, sequence }) => `${appName}@${sequence}`;
let format: FormatInstanceId = defaultFormat;
const counters = new Map<string, number>();
const issued = new Set<string>();
/** The bundle each app evaluates right now (between the adapter's loadBundle and the end of its evaluation). */
const evaluatingBundles = new Map<string, MicroFrontendBundle>();

export function setInstanceIdFormat(next: FormatInstanceId | undefined): void {
  format = next ?? defaultFormat;
}

export function setEvaluatingBundle(appName: string, bundle: MicroFrontendBundle | undefined): void {
  if (bundle == null) {
    evaluatingBundles.delete(appName);
  } else {
    evaluatingBundles.set(appName, bundle);
  }
}

export function getEvaluatingBundle(appName: string): MicroFrontendBundle | undefined {
  return evaluatingBundles.get(appName);
}
/** The id `defineContainer` issued for the evaluation that is running now, until its `initContainer` takes it. */
const pendingFirst = new Map<string, string>();

/**
 * The next id of the app. An id never stops an instance: when the host's `formatInstanceId` throws, or returns no
 * string, an empty one or one already issued, the instance gets the default `<appName>@<n>` (with the next free `n`).
 */
export function nextInstanceId(appName: string, bundle?: MicroFrontendBundle): string {
  const sequence = takeSequence(appName);
  const formatted = formatOrUndefined({ appName, sequence, bundle });
  if (formatted != null) {
    issued.add(formatted);
    return formatted;
  }
  let fallback = defaultFormat({ appName, sequence });
  while (issued.has(fallback)) {
    fallback = defaultFormat({ appName, sequence: takeSequence(appName) });
  }
  issued.add(fallback);
  return fallback;
}

function takeSequence(appName: string): number {
  const sequence = (counters.get(appName) ?? 0) + 1;
  counters.set(appName, sequence);
  return sequence;
}

function formatOrUndefined(info: MicroFrontendInstanceIdInfo): string | undefined {
  if (format === defaultFormat) {
    return undefined;
  }
  let instanceId: unknown;
  try {
    instanceId = format(info);
  } catch (error) {
    console.warn(`[micro-frontend] formatInstanceId threw for ${info.appName}; using the default id`, error);
    return undefined;
  }
  if (typeof instanceId !== 'string' || instanceId.length === 0 || issued.has(instanceId)) {
    console.warn(
      `[micro-frontend] formatInstanceId must return a new non-empty id; got '${String(instanceId)}' for ` +
        `${info.appName}; using the default id`
    );
    return undefined;
  }
  return instanceId;
}

/** `defineContainer`: a bundle's first evaluation (native ran it) gets a new id. */
export function instanceIdForDefinition(appName: string, bundle?: MicroFrontendBundle): string {
  const instanceId = nextInstanceId(appName, bundle);
  pendingFirst.set(appName, instanceId);
  return instanceId;
}

/**
 * `initContainer`: an instance run passes the id this runtime issued for it. A first evaluation passes nothing (or an
 * older native evaluator's own id), and takes the id its `defineContainer` call issued just before, in the same run.
 */
export function instanceIdForContainer(appName: string, received: unknown): string {
  if (typeof received === 'string' && issued.has(received)) {
    return received;
  }
  const pending = pendingFirst.get(appName);
  pendingFirst.delete(appName);
  return pending ?? nextInstanceId(appName, evaluatingBundles.get(appName));
}

/** Test helper: forgets every issued id and counter. */
export function resetInstanceIds(): void {
  format = defaultFormat;
  evaluatingBundles.clear();
  counters.clear();
  issued.clear();
  pendingFirst.clear();
}
