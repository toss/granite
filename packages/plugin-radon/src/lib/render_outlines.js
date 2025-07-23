const { updateInstrumentationOptions } = require("./instrumentation");
const { PluginMessageBridge } = require("./vendor/plugins/PluginMessageBridge");

let setupCompleted = false;

export function setup() {
  if (setupCompleted) {
    return;
  }
  setupCompleted = true;

  const messageBridge = new PluginMessageBridge("render-outlines");

  messageBridge.addMessageListener("updateInstrumentationOptions", (message) => {
    updateInstrumentationOptions(message);
  });

  updateInstrumentationOptions({
    reportRenders: (blueprintOutlines) => {
      messageBridge.sendMessage("rendersReported", { blueprintOutlines });
    },
  });
}
