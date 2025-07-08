/**
 * 이 스크립트는 React Native 0.72.6 이하 버전에서 누락된
 * `__REACT_DEVTOOLS_GLOBAL_HOOK__.reactDevtoolsAgent`를 생성하여 주입하는
 * 폴리필(Polyfill) 역할을 합니다.
 * 
 * - 네이티브 WebSocket을 사용하여 IDE와 직접 통신합니다.
 * - 로컬에 번들된 `createReactDevtoolsAgent.js`를 사용하여 공식 `Agent`와 `createBridge`를 가져옵니다.
 * - 최종적으로 생성된 Agent를 `hook.reactDevtoolsAgent`에 설정합니다.
 */

if (typeof window === 'undefined' && typeof global !== 'undefined') {
  global.window = global;
}

const hook = global.window.__REACT_DEVTOOLS_GLOBAL_HOOK__;

if (hook && !hook.reactDevtoolsAgent) {
  console.log("🔥 Radon Runtime: No reactDevtoolsAgent found. Polyfilling for RN <= 0.72.6...");

  try {
    const { Agent, createBridge } = require('./createReactDevtoolsAgent.js');
    console.log("🔥 Radon Runtime: createBridge", createBridge);
    console.log("🔥 Radon Runtime: Agent", Agent);

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
            fn(JSON.parse(event.data));
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
    hook.reactDevtoolsAgent = new Agent(bridge);
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