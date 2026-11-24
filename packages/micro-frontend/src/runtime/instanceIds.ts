/**
 * Instance ids: `<appName>@<n>`, numbered per app by this runtime, e.g. `shopping@1`, `shopping@2`.
 *
 * An app instance is one copy of an app's modules: the bundle's first evaluation, which native runs, or an instance
 * made from the app's container definition. The JavaScript runtime issues every id: native does not know the app
 * name, so it cannot number per app, and two issuers would hand out the same number (a new deployment evaluated by
 * native after instances made here). Native only passes `{ sourceUrl }`; an `evalId` that older native evaluators
 * still pass is ignored.
 *
 * An instance id names one copy for routing. It is not a security boundary.
 */
const counters = new Map<string, number>();
const issued = new Set<string>();
/** The id `defineContainer` issued for the evaluation that is running now, until its `initContainer` takes it. */
const pendingFirst = new Map<string, string>();

export function nextInstanceId(appName: string): string {
  const n = (counters.get(appName) ?? 0) + 1;
  counters.set(appName, n);
  const instanceId = `${appName}@${n}`;
  issued.add(instanceId);
  return instanceId;
}

/** `defineContainer`: a bundle's first evaluation (native ran it) gets a new id. */
export function instanceIdForDefinition(appName: string): string {
  const instanceId = nextInstanceId(appName);
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
  return pending ?? nextInstanceId(appName);
}

/** Test helper: forgets every issued id and counter. */
export function resetInstanceIds(): void {
  counters.clear();
  issued.clear();
  pendingFirst.clear();
}
