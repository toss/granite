export function getServiceKey(bundleRequest: string): string | null {
  const normalizedRequest = bundleRequest.trim();
  if (normalizedRequest.length === 0) {
    return null;
  }

  try {
    const url = new URL(normalizedRequest);
    const serviceKey = url.hostname;
    return serviceKey == null || serviceKey.length === 0 ? null : serviceKey;
  } catch {
    const serviceKey = normalizedRequest.split(/[/?#]/, 1)[0];
    return serviceKey == null || serviceKey.length === 0 ? null : serviceKey;
  }
}
