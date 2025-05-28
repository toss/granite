export function isDebugMode(scope: string) {
  return process.env.DEBUG === '*' || process.env.DEBUG === scope;
}
