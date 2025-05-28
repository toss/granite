// MARK: - GRANITE
let cachedResult = null;

module.exports = function isPnP() {
  if (cachedResult !== null) {
    return cachedResult;
  }

  try {
    require('pnpapi');
    return (cachedResult = true);
  } catch {
    return (cachedResult = false);
  }
};
