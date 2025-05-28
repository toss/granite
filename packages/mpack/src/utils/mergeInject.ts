type Inject = string[];

export function mergeInject(base: Inject, override: Inject): string[] {
  return [...base, ...override];
}
