export function printServerUrl({ host, port }: { host: string; port: number }) {
  console.log(`Development server is running at http://${host}:${port}`);
}
