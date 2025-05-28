export function toRuntimeString(runtime: string) {
  return runtime.replace(/\D+/g, '_');
}
