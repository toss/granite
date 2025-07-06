// Simplified Radon Agent for robust connection

// This is a simplified client that connects to the Radon IDE DevTools backend.
// It establishes a WebSocket connection and then uses a simplified bridge
// to handle the communication protocol, as the official one is part of the IDE.

// Create the global agent object immediately.
// Other modules might try to access it synchronously.
const agent = {
  _bridge: null,
  _queue: [],
  postMessage: (message) => {
    // Queue messages until the bridge is ready.
    if (agent._bridge) {
      agent._bridge.send('RNIDE_message', message);
    } else {
      agent._queue.push(message);
    }
  },
  onmessage: undefined,
};
globalThis.__radon_agent = agent;


function connectToDevTools(hook) {
  if (!hook) {
    return;
  }

  // --- Final Strategy: Client with Renderer Handshake ---
  if (hook.renderers && hook.renderers.has(1)) {
    const port = globalThis.__REACT_DEVTOOLS_PORT__;
    if (!port) {
      return;
    }

    const ws = new WebSocket(`ws://localhost:${port}`);
    let bridgeListeners = {};
    
    ws.onopen = () => {
      const bridge = {
        _renderer: null,
        addListener: (name, listener) => {
          bridgeListeners[name] = bridgeListeners[name] || [];
          bridgeListeners[name].push(listener);
        },
        send: (event, payload) => {
          ws.send(JSON.stringify({ event, payload }));
        },
        setRenderer(id, renderer) {
            this._renderer = renderer;
            if(this._renderer) {
                // The renderer is the authority on component tree inspection.
                // It needs a way to send messages back to the devtools (via the bridge).
                this._renderer.setBridge(this);
                // Let the devtools know we've attached.
                this.send('renderer-attached', { id, renderer });
            }
        }
      };
      
      agent._bridge = bridge;

      if (agent.onmessage) {
        bridge.addListener('RNIDE_message', agent.onmessage);
      }
      
      if (agent._queue.length > 0) {
        agent._queue.forEach(message => agent.postMessage(message));
        agent._queue = [];
      }
      
      // The DevTools hook will tell us when a renderer is available.
      // This is the "handshake".
      hook.sub('renderer', ({ id, renderer }) => {
          bridge.setRenderer(id, renderer);
      });

      hook.emit('react-devtools', { _bridge: bridge });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (bridgeListeners[data.event]) {
            bridgeListeners[data.event].forEach(listener => listener(data.payload));
        }
      } catch (e) {
        console.error(`[Radon Agent] Error parsing message from IDE: ${event.data}`, e);
      }
    };

    ws.onerror = (error) => {
      console.error("[Radon Agent] WebSocket connection error:", error.message);
    };
  }
}

// Wait for the hook to appear, then connect
function initialize() {
  if (globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    connectToDevTools(globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__);
  } else {
    setTimeout(initialize, 100);
  }
}

initialize();