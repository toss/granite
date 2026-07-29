export function getServiceKey(serviceName: string): string | null {
  const serviceKey = serviceName.trim().toLowerCase();
  return serviceKey.length === 0 ? null : serviceKey;
}
