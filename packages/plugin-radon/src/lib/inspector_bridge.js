console.log('🔥🔥🔥🔥 INSPECTOR BRIDGE: EXECUTING LATEST GLOBAL DUMMY VERSION 🔥🔥🔥🔥');

// This is a mock implementation to avoid crashes when the Radon IDE agent is not available.
// We use a global object to bypass potential module resolution issues in the bundler.
globalThis.__RADON_INSPECTOR_BRIDGE__ = {
  sendMessage: () => {},
  addMessageListener: () => {},
  removeMessageListener: () => {},
  showMessage: () => {}, // Ensure this property always exists
};

console.log('🔥🔥🔥🔥 INSPECTOR BRIDGE: global.__RADON_INSPECTOR_BRIDGE__ initialized:', globalThis.__RADON_INSPECTOR_BRIDGE__);

// We still export for consistency, though it might not be used.
module.exports = globalThis.__RADON_INSPECTOR_BRIDGE__;
