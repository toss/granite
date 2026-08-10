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
  "../../android/src/main/java/com/teleport/host/PortalReactRootView.kt",
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

  it("uses the library-owned detached Fabric root with an app-selected module", () => {
    const portalHostActivity = readFileSync(portalHostActivityPath, "utf8");
    const portalReactRootView = readFileSync(portalReactRootViewPath, "utf8");

    expect(portalHostActivity).toContain("PortalReactRootView");
    expect(portalHostActivity).toContain("CONTROLLER_MODULE_NAME");
    expect(portalReactRootView).toContain("class PortalReactRootView");
    expect(portalReactRootView).toContain("private val moduleName: String");
    expect(portalReactRootView).toContain(
      "override fun getJSModuleName(): String = moduleName",
    );
    expect(portalReactRootView).not.toContain("TeleportController");
  });
});
