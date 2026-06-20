# Code Style Knowledge

## TypeScript And Modules

The root `tsconfig.json` uses strict TypeScript settings with `moduleResolution: "Bundler"`, `module: "ESNext"`, `target: "ESNext"`, `jsx: "react-jsx"`, `isolatedModules: true`, `noUncheckedIndexedAccess: true`, and unused local/parameter checks.

Prefer the style already used in the touched package. Many packages are ESM (`"type": "module"`), but some build outputs publish both CJS and ESM through `exports`.

## Formatting

Prettier uses `printWidth: 120`, single quotes, and trailing commas where valid in ES5. `.editorconfig` sets LF line endings, final newlines, UTF-8 for JS/JSON/YAML, and 2-space indentation for JS/JSON/YAML.

Do not reformat unrelated files or generated output.

## Lint Rules That Matter

Root ESLint enforces:

- curly braces for all control flow
- strict equality except null comparisons
- no implicit coercion
- no duplicate imports
- sorted import groups with no blank lines between groups
- unused imports as errors
- React Hooks rules
- warning comments such as `TODO` and `FIXME` as warnings

The root ESLint config ignores docs, templates, fixtures, generated output, Yarn internals, and Granite generated directories.

## Package Exports

Published packages declare public surface through `package.json` fields and `exports`. When changing public entrypoints, update the package source, build config, generated declarations through the package build, and export metadata together.

Do not add an `index.ts` only for re-export convenience unless the package already uses that pattern for its public surface.

## Dependencies

Yarn PnP uses `pnpFallbackMode: none`; every dependency needed by a package must be declared. Prefer existing Yarn catalogs in `.yarnrc.yml` for shared versions.

Do not bypass PnP by relying on undeclared transitive dependencies.

## Generated Files

Do not hand-edit `dist` files or other generated artifacts as source. Regenerate them through the owning package command when generated output is part of the required evidence.
