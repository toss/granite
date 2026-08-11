import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const iosDirectory = resolve(__dirname, "../ios/TeleportExample");
const nativeRouterPath = resolve(iosDirectory, "NativeRouter.swift");
const nativeRouterViewControllerPath = resolve(
  iosDirectory,
  "NativeRouterViewController.swift",
);
const portalHostContainerPath = resolve(
  __dirname,
  "../../../ios/PortalHostContainerView.mm",
);
const appDelegatePath = resolve(iosDirectory, "AppDelegate.swift");
const sceneDelegatePath = resolve(iosDirectory, "SceneDelegate.swift");
const infoPlistPath = resolve(iosDirectory, "Info.plist");
const portalHostHeaderPath = resolve(__dirname, "../../../ios/PortalHostView.h");
const portalHostSourcePath = resolve(__dirname, "../../../ios/PortalHostView.mm");
const portalViewSourcePath = resolve(__dirname, "../../../ios/PortalView.mm");
const portalRegistryHeaderPath = resolve(
  __dirname,
  "../../../ios/PortalRegistry.h",
);
const podspecPath = resolve(
  __dirname,
  "../../../GraniteMicroFrontendRuntime.podspec",
);

describe("iOS UIViewController contract", () => {
  it("keeps one attached React controller tree behind a native Main router", () => {
    expect(existsSync(nativeRouterPath)).toBe(true);

    const appDelegate = readFileSync(appDelegatePath, "utf8");
    const sceneDelegate = readFileSync(sceneDelegatePath, "utf8");

    expect(appDelegate).toContain('withModuleName: "TeleportController"');
    expect(appDelegate).toContain("controllerRootView");
    expect(appDelegate).toContain("insertSubview(rootView, at: 0)");
    expect(existsSync(nativeRouterViewControllerPath)).toBe(true);
    expect(sceneDelegate).toContain("NativeRouterViewController");
    expect(sceneDelegate).toContain("UINavigationController");
  });

  it("routes Main and incoming service URLs to UIViewController-owned portal hosts", () => {
    expect(existsSync(nativeRouterPath)).toBe(true);

    const nativeRouter = readFileSync(nativeRouterPath, "utf8");
    const sceneDelegate = readFileSync(sceneDelegatePath, "utf8");
    const infoPlist = readFileSync(infoPlistPath, "utf8");

    expect(nativeRouter).toContain("PortalHostViewController");
    expect(nativeRouter).toContain("cross-activity-primary");
    expect(nativeRouter).toContain("cross-activity-secondary");
    expect(sceneDelegate).toContain("openURLContexts");
    expect(sceneDelegate).toContain('case "teleport-portal"');
    expect(sceneDelegate).toContain('case "teleport-example"');
    expect(infoPlist).toContain("<string>teleport-portal</string>");
    expect(infoPlist).toContain("<string>teleport-example</string>");
  });

  it("keeps Main, Store, and Wallet controllers attached while routing", () => {
    expect(existsSync(nativeRouterViewControllerPath)).toBe(true);

    const nativeRouterViewController = readFileSync(
      nativeRouterViewControllerPath,
      "utf8",
    );

    expect(nativeRouterViewController).toContain("MainViewController");
    expect(nativeRouterViewController).toMatch(
      /PortalHostViewController\(\s*hostName: storeHostName\s*\)/,
    );
    expect(nativeRouterViewController).toMatch(
      /PortalHostViewController\(\s*hostName: walletHostName\s*\)/,
    );
    expect(nativeRouterViewController).toContain("addChild(viewController)");
    expect(nativeRouterViewController).toContain("view.isHidden");
  });

  it("animates forward routes like present and back routes like dismiss", () => {
    const nativeRouterViewController = readFileSync(
      nativeRouterViewControllerPath,
      "utf8",
    );

    expect(nativeRouterViewController).toContain("case present");
    expect(nativeRouterViewController).toContain("case dismiss");
    expect(nativeRouterViewController).toContain(
      "CGAffineTransform(translationX: 0, y: travelDistance)",
    );
    expect(nativeRouterViewController).toContain("UIView.animate(");
    expect(nativeRouterViewController).toContain("belowSubview: fromView");
  });

  it("exposes native host naming and resolves the latest attached host per window", () => {
    const portalHostHeader = readFileSync(portalHostHeaderPath, "utf8");
    const portalHostSource = readFileSync(portalHostSourcePath, "utf8");
    const portalRegistryHeader = readFileSync(portalRegistryHeaderPath, "utf8");

    expect(portalHostHeader).toContain(
      "- (void)setName:(nullable NSString *)name;",
    );
    expect(portalHostSource).toContain("- (void)didMoveToWindow");
    expect(portalRegistryHeader).toContain(
      "resolveHostWithName:(nullable NSString *)name",
    );
    expect(portalRegistryHeader).toContain("sourceView:(UIView *)sourceView");
  });

  it("attaches a Fabric touch handler to each UIKit-owned RN destination", () => {
    expect(existsSync(nativeRouterPath)).toBe(true);
    expect(existsSync(portalHostContainerPath)).toBe(true);

    const nativeRouter = readFileSync(nativeRouterPath, "utf8");
    const portalHostContainer = readFileSync(portalHostContainerPath, "utf8");

    expect(nativeRouter).toContain("PortalHostContainerView");
    expect(portalHostContainer).toContain("RCTSurfaceTouchHandler");
    expect(portalHostContainer).toContain("[_touchHandler attachToView:self]");
  });

  it("keeps Fabric implementation headers out of the Swift-facing Pod umbrella", () => {
    const podspec = readFileSync(podspecPath, "utf8");
    const publicHeaders = podspec.match(
      /s\.public_header_files\s*=\s*\[(.*?)\]/s,
    )?.[1];
    const privateHeaders = podspec.match(
      /s\.private_header_files\s*=\s*\[(.*?)\]/s,
    )?.[1];

    expect(publicHeaders).toContain('"ios/PortalHostContainerView.h"');
    expect(publicHeaders).not.toContain('"ios/PortalHostView.h"');
    expect(privateHeaders).toContain('"ios/PortalHostView.h"');
  });

  it("detaches RN-owned view controllers before moving portal children", () => {
    const portalViewSource = readFileSync(portalViewSourcePath, "utf8");

    expect(portalViewSource).toContain(
      "detachViewControllersFromChildren:children",
    );
    expect(portalViewSource).toContain("willMoveToParentViewController:nil");
    expect(portalViewSource).toContain("removeFromParentViewController");
  });
});
