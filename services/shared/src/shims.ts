export function requireContextShim(): any {
  const requireContext = function () {
    return;
  };
  requireContext.keys = () => [];

  return requireContext;
}
