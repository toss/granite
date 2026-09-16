/**
 * mock createRoute
 */
function createRoute(path: string, options?: any) {
  return [path, options];
}

const Route = createRoute('/test', {
  validateParams: (params: any) => params as { name: string },
});

export { Route };

export default function HasExportRoute() {
  return;
}
