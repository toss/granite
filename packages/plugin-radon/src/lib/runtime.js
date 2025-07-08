console.log("🔥 Radon Runtime: Initializing bulletproof globals...");

require("./react_devtools_agent")

globalThis.__RADON_INSPECTOR_BRIDGE__ = require("./inspector_bridge")

global.__RNIDE_enabled = true;

global.__RNIDE_register_navigation_plugin = function (name, plugin) {
  require("./wrapper.jsx").registerNavigationPlugin(name, plugin);
};

global.__RNIDE_register_dev_plugin = function (name) {
  require("./wrapper.jsx").registerDevtoolPlugin(name);
};

AppRegistry.setWrapperComponentProvider(() => {
  return require("./wrapper.jsx").AppWrapper;
});

const origSetWrapperComponentProvider = AppRegistry.setWrapperComponentProvider;
AppRegistry.setWrapperComponentProvider = (provider) => {
  console.info("RNIDE: The app is using a custom wrapper component provider");
  origSetWrapperComponentProvider((appParameters) => {
    const CustomWrapper = provider(appParameters);
    return require("./wrapper.jsx").createNestedAppWrapper(CustomWrapper);
  });
};