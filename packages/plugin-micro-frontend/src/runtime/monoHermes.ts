export function isMonoHermes(): boolean {
  const runtime = globalThis.__MICRO_FRONTEND__;

  return runtime?.__IS_MONO_HERMES__ === true || (runtime?.__MONO_HERMES_EVALUATIONS__ ?? 0) > 0;
}
