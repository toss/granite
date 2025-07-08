require('./react_devtools_polyfill.js');

const hook = global.window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
let devtoolsAgent = undefined;
const messageQueue = [];

const agent = {
  postMessage: (message) => {
    if (devtoolsAgent && devtoolsAgent._bridge) {
       try {
          devtoolsAgent._bridge.send("RNIDE_message", message);
       } catch (error) {
         console.error("🔥 Radon Runtime: Failed to post message", error);
         messageQueue.push(message);
       }
    } else {
      messageQueue.push(message);
    }
  },
  onmessage: undefined,
};

const setDevtoolsAgent = (newDevtoolsAgent) => {
  if (!newDevtoolsAgent || !newDevtoolsAgent._bridge) {
    console.warn("🔥 Radon Runtime: setDevtoolsAgent called with invalid agent.");
    return;
  }

  devtoolsAgent = newDevtoolsAgent;
  
   try {
    devtoolsAgent._bridge.addListener("RNIDE_message", (message) => {
      if (agent.onmessage) {
        agent.onmessage(message);
      }
    });

    // 큐에 쌓여있던 메시지들을 전송합니다.
    const messagesToFlush = messageQueue.slice();
    messageQueue.length = 0;
    if (messagesToFlush.length > 0) {
      console.log(`✅ Radon Runtime: Flushing ${messagesToFlush.length} queued messages.`);
      messagesToFlush.forEach(agent.postMessage);
    }
    
    console.log("✅ Radon Runtime: Radon agent is connected to React DevTools.");
   } catch (error) {
     console.error("🔥 Radon Runtime: Error setting up devtools agent", error);
   }
};


if (hook && hook.reactDevtoolsAgent) {
  setDevtoolsAgent(hook.reactDevtoolsAgent);
} else if (hook) {
  // reactDevtoolsAgent가 아직 준비되지 않은 경우를 대비하여, 이벤트를 리스닝합니다.
  hook.on("react-devtools", setDevtoolsAgent);
} else {
  console.error("🔥 Radon Runtime: __REACT_DEVTOOLS_GLOBAL_HOOK__ not found.");
}

globalThis.__RADON_AGENT__ = agent;
console.log("✅ Radon Runtime: __RADON_AGENT__ initialized.");