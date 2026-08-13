import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const androidMainDirectory = resolve(
  __dirname,
  "../android/app/src/main/java/teleport/example",
);
const manifestPath = resolve(
  __dirname,
  "../android/app/src/main/AndroidManifest.xml",
);
const portalHostActivityPath = resolve(
  androidMainDirectory,
  "ReactNativePotalHostActivity.kt",
);
const portalReactRootViewPath = resolve(
  __dirname,
  "../../../android/src/main/java/com/teleport/host/PortalReactRootView.kt",
);

describe("Android Activity contract", () => {
  it("keeps exactly one native router and one route-driven React Native host", () => {
    const activitySources = readdirSync(androidMainDirectory)
      .filter((fileName) => fileName.endsWith("Activity.kt"))
      .sort();
    const manifest = readFileSync(manifestPath, "utf8");
    const manifestActivities = Array.from(
      manifest.matchAll(/android:name="\.([^"]+Activity)"/g),
      (match) => match[1],
    ).sort();

    expect(activitySources).toEqual([
      "MainActivity.kt",
      "ReactNativePotalHostActivity.kt",
    ]);
    expect(manifestActivities).toEqual([
      "MainActivity",
      "ReactNativePotalHostActivity",
    ]);
  });

  it("resolves the portal host name from the incoming URI without service mappings", () => {
    const portalHostActivity = readFileSync(portalHostActivityPath, "utf8");

    expect(portalHostActivity).toContain("intent.data?.host");
    expect(portalHostActivity).not.toMatch(
      /PRIMARY|SECONDARY|primary|secondary/,
    );
    expect(portalHostActivity).not.toContain("cross-activity-");
  });

  // What PortalReactRootView promises about itself — Fabric rendering, the host's surface id, the
  // host's JS module name — is asserted against the compiled class by
  // ../../../android/src/test/java/com/teleport/host/PortalReactRootViewContractTest.kt. Matching
  // those substrings from here proved nothing about whether the library compiled or behaved.
  //
  // Two checks stay. The first is app-side wiring: only this example knows it hands the library its
  // own controller name. The second is about the library's source *text* rather than its behaviour —
  // that name must not appear anywhere in it, comments and imports included, which no compiled
  // assertion can see. That second check is also why this file still resolves a path into the
  // library, and that path constant is what actually had to change when the package moved from
  // packages/portal to packages/micro-frontend.
  it("wires the library root view and keeps this app's controller name out of the library", () => {
    const portalHostActivity = readFileSync(portalHostActivityPath, "utf8");
    const portalReactRootView = readFileSync(portalReactRootViewPath, "utf8");

    expect(portalHostActivity).toContain("PortalReactRootView");
    expect(portalHostActivity).toContain("CONTROLLER_MODULE_NAME");
    expect(portalReactRootView).not.toContain("TeleportController");
  });
});
