jest.mock("@granite-js/portal", () => ({
  usePortal: jest.fn().mockReturnValue({ removePortal: jest.fn() }),
  Portal: "Portal",
  PortalHost: "PortalHost",
  PortalProvider: "PortalProvider",
}));
