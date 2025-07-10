if (typeof window === 'undefined' && typeof global !== 'undefined') {
  global.window = global;
}

const hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
if (hook && !hook.reactDevtoolsAgent) {

  try {
    const { Agent, createBridge } = require('./createReactDevtoolsAgent.js');
    const rendererConfig = require('./createRendererConfig.js').default;
    const hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (hook && hook.renderers && hook.renderers.has(1)) {
        const renderer = hook.renderers.get(1);
        renderer.rendererConfig = rendererConfig;
    }


    const port = globalThis.__REACT_DEVTOOLS_PORT__;
    if (!port) {
      throw new Error("__REACT_DEVTOOLS_PORT__ is not set.");
    }

    const url = `ws://localhost:${port}`;

    const websocket = new WebSocket(url);
    const messageQueue = [];

    const wall = {
      listen(fn) {
        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            fn(data);
          } catch (e) {
            console.error("🔥 Radon Runtime: Error parsing message in wall.listen", e);
          }
        };
      },
      send(event, payload) {
        const message = JSON.stringify({ event, payload });
        if (websocket.readyState === WebSocket.OPEN) {
          try {
            websocket.send(message);
          } catch (error) {
            console.error("🔥 Radon Runtime: Failed to send message", error);
          }
        } else if (websocket.readyState === WebSocket.CONNECTING) {
          messageQueue.push(message);
        } else {
          console.warn("🔥 Radon Runtime: WebSocket is not connected. Message dropped.");
        }
      }
    };

    websocket.onopen = () => {
      if (messageQueue.length > 0) {
        messageQueue.forEach(message => {
          try {
            websocket.send(message);
          } catch (error) {
            console.error("🔥 Radon Runtime: Failed to send queued message", error);
          }
        });
        messageQueue.length = 0;
      }
    };

    websocket.onclose = (event) => {
      console.log(`🔥 Radon Runtime: WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
    };

    websocket.onerror = (error) => {
      console.error("🔥 Radon Runtime: WebSocket error:", error);
    };

    const bridge = createBridge(globalThis, wall);
    const agent = new Agent(bridge);
    hook.reactDevtoolsAgent = agent;

  } catch (error) {
    console.error("🔥 Radon Runtime: Failed to polyfill reactDevtoolsAgent.", error);
    const bridge = { 
      send: () => {}, 
      addListener: () => {} 
    };
    hook.reactDevtoolsAgent = { _bridge: bridge };
  }
} 