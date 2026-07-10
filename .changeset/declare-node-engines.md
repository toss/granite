---
'@granite-js/plugin-core': patch
---

Declare the minimum required Node.js version (`>=22.15.0`) in the `engines` field.

`@granite-js/plugin-core` is a CJS bundle that does `require('c12')`, and c12 v3 is an ESM-only package. Under Yarn PnP, the `require(esm)` module graph is resolved with Node's default ESM resolver on Node.js < 22.15.0, ignoring the PnP loader hooks — so c12's own imports (e.g. `pathe`) fail with `ERR_MODULE_NOT_FOUND` at runtime. Node.js 22.15.0 routes `require(esm)` resolution through registered customization hooks (nodejs/node#55698), which makes it work with Yarn PnP.

Declaring `engines` documents this requirement in a machine-readable way: npm prints an `EBADENGINE` warning at install time, pnpm fails the install with `engine-strict=true`, and deployment platforms and tooling pick up the field. Note that Yarn Berry does not enforce `engines`, so PnP users still need a matching Node.js version at runtime.
