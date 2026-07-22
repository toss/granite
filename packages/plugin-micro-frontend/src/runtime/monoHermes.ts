export interface MonoHermesInitialProps {
  readonly _monoHermes?: boolean;
}

export function initializeMonoHermes(initialProps: MonoHermesInitialProps): void {
  if (initialProps._monoHermes === true) {
    globalThis.__MICRO_FRONTEND__.__IS_MONO_HERMES__ = true;
  }
}

export function isMonoHermes(): boolean {
  return globalThis.__MICRO_FRONTEND__?.__IS_MONO_HERMES__ === true;
}
