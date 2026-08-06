import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(__dirname, "../..");

describe("package identity", () => {
  it("publishes and consumes the Granite Portal package identity", () => {
    // Given the package, example workspace, TypeScript resolver, and podspec
    const rootPackage = readFileSync(
      resolve(repositoryRoot, "package.json"),
      "utf8",
    );
    const examplePackage = readFileSync(
      resolve(repositoryRoot, "example/package.json"),
      "utf8",
    );
    const tsconfig = readFileSync(
      resolve(repositoryRoot, "tsconfig.json"),
      "utf8",
    );
    const podspecPath = resolve(repositoryRoot, "GranitePortal.podspec");

    // When their machine-consumed package identities are inspected
    // Then every public package boundary uses the Granite Portal identity
    expect(rootPackage).toMatch(/"name": "@granite-js\/portal"/);
    expect(examplePackage).toMatch(/"name": "@granite-js\/portal-example"/);
    expect(examplePackage).toMatch(/"@granite-js\/portal": "workspace:\*"/);
    expect(tsconfig).toMatch(/"@granite-js\/portal": \["\.\/src\/index"\]/);
    expect(existsSync(podspecPath)).toBe(true);
    expect(readFileSync(podspecPath, "utf8")).toMatch(
      /s\.name\s*=\s*"GranitePortal"/,
    );
    expect(existsSync(resolve(repositoryRoot, "Teleport.podspec"))).toBe(false);
  });
});
