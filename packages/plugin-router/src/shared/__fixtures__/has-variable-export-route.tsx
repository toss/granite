/**
 * mock createRoute
 */
function createRoute(path: string, options?: any) {
  return [path, options];
}

export const Route = createRoute('/test', {
  validateParams: (params: any) => params as { name: string },
});

export default function HasExportRoute() {
  return;
}
