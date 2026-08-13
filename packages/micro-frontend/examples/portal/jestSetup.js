jest.mock("@granite-js/micro-frontend", () => {
  const { useEffect, useState } = require("react");
  const sessionSubscribers = new Set();

  // Lets a test stand in for native session events (openApp / sessionVisibilityChanged / closeApp)
  // without a TurboModule.
  globalThis.emitMicroFrontendSessions = (sessions) => {
    for (const subscriber of sessionSubscribers) {
      subscriber(sessions);
    }
  };

  return {
    Portal: "Portal",
    createMicroFrontendRuntime: () => ({}),
    useMicroFrontendSessions: () => {
      const [sessions, setSessions] = useState([]);

      useEffect(() => {
        sessionSubscribers.add(setSessions);
        return () => {
          sessionSubscribers.delete(setSessions);
        };
      }, []);

      return sessions;
    },
  };
});
