/**
 * Evaluation ids (`evalId`): `<appName>@<n>`, numbered per app by this runtime, e.g. `shopping@1`, `shopping@2`.
 *
 * The JavaScript runtime issues every id, also for a bundle's first evaluation, which native runs: native does not
 * know the app name, so it cannot number per app, and two issuers would hand out the same number (a new deployment
 * evaluated by native after instances made here). Native only passes `{ sourceUrl }`; an `evalId` that older native
 * evaluators still pass is ignored.
 *
 * An evalId names one copy of an app's modules for routing. It is not a security boundary.
 */
const counters = new Map<string, number>();
const issued = new Set<string>();
/** The id `defineContainer` issued for the evaluation that is running now, until its `initContainer` takes it. */
const pendingFirst = new Map<string, string>();

export function nextEvalId(appName: string): string {
  const n = (counters.get(appName) ?? 0) + 1;
  counters.set(appName, n);
  const evalId = `${appName}@${n}`;
  issued.add(evalId);
  return evalId;
}

/** `defineContainer`: a bundle's first evaluation (native ran it) gets a new id. */
export function evalIdForDefinition(appName: string): string {
  const evalId = nextEvalId(appName);
  pendingFirst.set(appName, evalId);
  return evalId;
}

/**
 * `initContainer`: an instance run passes the id this runtime issued for it. A first evaluation passes nothing (or an
 * older native evaluator's own id), and takes the id its `defineContainer` call issued just before, in the same run.
 */
export function evalIdForContainer(appName: string, received: unknown): string {
  if (typeof received === 'string' && issued.has(received)) {
    return received;
  }
  const pending = pendingFirst.get(appName);
  pendingFirst.delete(appName);
  return pending ?? nextEvalId(appName);
}

/** Test helper: forgets every issued id and counter. */
export function resetEvalIds(): void {
  counters.clear();
  issued.clear();
  pendingFirst.clear();
}
