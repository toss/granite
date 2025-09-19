const hook = global.window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
let devtoolsAgent = undefined;
let messageQueue = [];

const agent = {
  postMessage: (message) => {
    if (devtoolsAgent) {
      devtoolsAgent._bridge.send("RNIDE_message", message);
    } else {
      messageQueue.push(message);
    }
  },
  onmessage: undefined,
};

const setDevtoolsAgent = (newDevtoolsAgent) => {
  if (!newDevtoolsAgent) {
    return;
  }
  devtoolsAgent = newDevtoolsAgent;
  devtoolsAgent._bridge.addListener("RNIDE_message", (message) => {
    if (agent.onmessage) {
      agent.onmessage(message);
    }
  });
  const messages = messageQueue;
  messageQueue = [];
  messages.forEach((message) => {
    devtoolsAgent._bridge.send("RNIDE_message", message);
  });
  
};

if (hook && hook.reactDevtoolsAgent) {
  setDevtoolsAgent(hook.reactDevtoolsAgent);
} else if (hook) {
  // Check with polling method in case reactDevtoolsAgent is set later
  const checkForAgent = () => {
    if (hook.reactDevtoolsAgent) {
      setDevtoolsAgent(hook.reactDevtoolsAgent);
    } else {
      setTimeout(checkForAgent, 100);
    }
  };
  checkForAgent();
} else {
  console.error("🔥 Radon Runtime: __REACT_DEVTOOLS_GLOBAL_HOOK__ not found.");
}


globalThis.__RADON_AGENT__ = agent;