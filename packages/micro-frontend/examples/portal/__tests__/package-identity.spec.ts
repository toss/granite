import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const packageRoot = resolve(__dirname, "../../..");
const exampleRoot = resolve(packageRoot, "examples/portal");

describe("package identity", () => {
  it("publishes and consumes the Granite Portal package identity", () => {
    // Given the package, example workspace, and podspec
    const rootPackage = readFileSync(
      resolve(packageRoot, "package.json"),
      "utf8",
    );
    const examplePackage = readFileSync(
      resolve(packageRoot, "examples/portal/package.json"),
      "utf8",
    );
    const podspecPath = resolve(
      packageRoot,
      "GraniteMicroFrontendRuntime.podspec",
    );

    // When their machine-consumed package identities are inspected
    // Then every public package boundary uses the Granite Portal identity
    expect(rootPackage).toMatch(/"name": "@granite-js\/micro-frontend"/);
    expect(examplePackage).toMatch(
      /"name": "@granite-js\/micro-frontend-portal-example"/,
    );
    expect(examplePackage).toMatch(
      /"@granite-js\/micro-frontend": "file:\.\.\/\.\."/,
    );
    expect(existsSync(podspecPath)).toBe(true);
    expect(readFileSync(podspecPath, "utf8")).toMatch(
      /s\.name\s*=\s*"GraniteMicroFrontendRuntime"/,
    );
    expect(existsSync(resolve(packageRoot, "GranitePortal.podspec"))).toBe(false);
  });

  it("uses one standard React Native autolinking path", () => {
    const reactNativeConfig = readFileSync(
      resolve(exampleRoot, "react-native.config.js"),
      "utf8",
    );

    expect(reactNativeConfig).not.toContain("dependencies:");
  });
});
