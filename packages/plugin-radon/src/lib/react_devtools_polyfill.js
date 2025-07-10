if (typeof window === 'undefined' && typeof global !== 'undefined') {
  global.window = global;
}

const hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
if (hook && !hook.reactDevtoolsAgent) {
  console.log("🔥 Radon Runtime: No reactDevtoolsAgent found. Polyfilling for RN <= 0.72.6...");

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
    console.log(`🔥 Radon Runtime: Polyfill connecting to IDE WebSocket at ${url}`);

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
          console.log("🔥 Radon Runtime: Message queued (WebSocket connecting)");
        } else {
          console.warn("🔥 Radon Runtime: WebSocket is not connected. Message dropped.");
        }
      }
    };

    websocket.onopen = () => {
      console.log("✅ Radon Runtime: WebSocket connected successfully");
      if (messageQueue.length > 0) {
        console.log(`🔥 Radon Runtime: Sending ${messageQueue.length} queued messages`);
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
    console.log("✅ Radon Runtime: Successfully polyfilled reactDevtoolsAgent.");

  } catch (error) {
    console.error("🔥 Radon Runtime: Failed to polyfill reactDevtoolsAgent.", error);
    const bridge = { 
      send: () => {}, 
      addListener: () => {} 
    };
    hook.reactDevtoolsAgent = { _bridge: bridge };
  }
} 