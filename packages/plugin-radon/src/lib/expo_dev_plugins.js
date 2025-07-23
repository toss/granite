export function register(pluginName) {
  if (global.__RNIDE_register_dev_plugin) {
    global.__RNIDE_register_dev_plugin(pluginName);
  }
}
