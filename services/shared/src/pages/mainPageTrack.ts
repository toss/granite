export type SharedMainPageTrack = 'legacy' | 'serviceSession';

export function resolveMainPageTrack(initialProps: { readonly _monoHermes?: unknown }): SharedMainPageTrack {
  return initialProps._monoHermes === true ? 'serviceSession' : 'legacy';
}
