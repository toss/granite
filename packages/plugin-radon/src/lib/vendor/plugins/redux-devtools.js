const { PluginMessageBridge } = require("./PluginMessageBridge");
const { createComposeWithDevTools } = require("./third-party/redux-devtools-expo-dev-plugin");

export const compose = (...args) => {
  if (global.__RNIDE_register_dev_plugin) {
    global.__RNIDE_register_dev_plugin("redux-devtools");
  }
  const proxyClient = new PluginMessageBridge("redux-devtools");
  return createComposeWithDevTools(() => proxyClient)(...args);
};
