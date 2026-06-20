# Verification Knowledge

## Environment Baseline

Local tool hints live in both `.nvmrc` and `mise.toml`; CI uses `.nvmrc` through `actions/setup-node@v4`, enables Corepack, and installs dependencies with `yarn install --immutable` in `.github/actions/setup-node-yarn/action.yml`.

Because Yarn Plug'n'Play is enabled, run commands through `yarn` from the relevant workspace instead of calling package binaries directly.

## Root Commands

- `yarn build:all` runs `nx run-many --targets=build`. CI runs this first and uploads build artifacts for later jobs.
- `yarn lint` runs `eslint .` with the root `eslint.config.cjs` ignore list.
- `yarn typecheck:all` runs `nx run-many -t typecheck`.
- `yarn test:all` runs `yarn test:parallel` and then `yarn test:no-parallel`.
- `yarn test:parallel` runs `nx run-many -t test --nxBail`.
- `yarn test:no-parallel` runs `nx run-many -t test:no-parallel --parallel=false --nxBail`.
- `yarn check-exports` runs `.scripts/check-exports.mts`.
- `yarn check-licenses` checks generated license output.
- `yarn consistency-check-licenses` checks license consistency.

## Package-Scoped Commands

For narrow changes, prefer the smallest package workspace command that covers the touched package:

- TypeScript packages usually expose `yarn workspace <workspace-name> typecheck`.
- Packages with tests expose either `test` or `test:no-parallel`.
- Build tools vary by package: `tsdown`, `tsup`, `bob build`, TypeScript build configs, Granite build, or Gradle.
- Example Granite services use package-local `granite build` scripts.
- `packages/granite-screen` builds its Gradle plugin from `packages/granite-screen/gradle-plugin`.

Check the target package `package.json` before choosing the command.

## Docs Verification

Run docs commands from `docs/`:

- `yarn docs:build` builds the VitePress documentation site and is the command used by the docs deployment workflow.
- `yarn docs:dev` starts local VitePress development.
- `yarn docs:preview` previews the built VitePress site.

For markdown-only repository knowledge edits, browser validation is not needed. Reread changed markdown, verify routed paths exist, and confirm documented commands still exist.

## CI Coverage

`.github/workflows/integrations.yaml` runs build, lint, typecheck, and tests on pushes to `main` and pull requests. The lint, typecheck, and test jobs depend on the setup build job and reuse build artifacts. The workflow artifact paths still include `tools/dist`, even though the root workspace list currently has no `tools` workspace.

`.github/workflows/docs-workflow.yaml` builds the VitePress site and checks that `docs/.vitepress/dist/index.html` exists before deploying GitHub Pages.

`.github/workflows/release.yaml` runs `yarn build:all` on `main` before Changesets versioning or publishing.

## Blind Spots

Root CI does not run every docs preview path, native mobile runtime scenario, or cloud deployment path. For changes that affect React Native runtime behavior, native integration, AWS resources, or deployment workflows, add a focused package-level check and document any environment-dependent gap in the handoff.

Some commands depend on prior build output because Nx target defaults make tests and typechecks depend on upstream builds. If a local failure mentions missing `dist` output or declarations, run the required build target before changing logic.
