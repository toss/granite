import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "plugins/index": "src/plugins/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  inlineOnly: false,
  exports: true,
  fixedExtension: false,
});
