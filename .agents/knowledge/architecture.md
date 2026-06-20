# Architecture Knowledge

## Repository Shape

Granite is organized as a Yarn workspace monorepo. The root `package.json` declares workspaces for `packages/*`, `services/*`, `infra/*`, and `docs`.

Nx discovers workspace package targets from package scripts. `nx.json` makes `typecheck`, `test`, and `test:no-parallel` depend on upstream `build` targets, while `build` outputs each project `dist` directory.

## Primary Runtime Packages

- `packages/react-native` is the core public runtime package. Start at `packages/react-native/src/index.ts` for exported components and utilities, `packages/react-native/src/config.ts` for config re-exports, and `packages/react-native/src/cli.ts` for CLI-facing runtime exports.
- `packages/mpack` is the Granite bundler package. Start at `packages/mpack/src/index.ts` and `packages/mpack/src/bundler/Bundler.ts` for build flow, plugin driver integration, and ESBuild context handling.
- `packages/plugin-core` owns shared Granite config and plugin contracts. Start at `packages/plugin-core/src/schema/pluginConfig.ts`, `packages/plugin-core/src/config/defineConfig.ts`, and `packages/plugin-core/src/utils/resolvePlugins.ts`.
- `packages/plugin-*` packages extend Granite build or dev behavior through the plugin-core contracts. Keep package-specific plugin behavior inside the matching plugin package.
- `packages/native` is a facade for native React Native ecosystem packages and related generated declarations.
- `packages/create-granite-app` owns the scaffolding CLI and app/tool templates.

## Infrastructure Packages

- `infra/forge-cli` is the deployment CLI. Start at `infra/forge-cli/src/index.ts` and `infra/forge-cli/src/commands/`.
- `infra/deployment-manager` provides deployment metadata and helper APIs consumed by deployment and AWS integration code.
- `infra/pulumi-aws` provides Pulumi resources and Lambda handlers for Granite bundle CDN behavior. Start at `infra/pulumi-aws/src/react-native-cdn.ts` and `infra/pulumi-aws/src/lambda/`.

## Services And Docs

- `services/counter`, `services/shared`, and `services/showcase` are example Granite apps with `granite.config.ts` and package-local scripts.
- `services/shared` is an example host app for the reserved `shared` host bundle concept. The service directory itself is an example, but the host/shared bundle role is a real runtime concept that Granite integrations need to account for.
- `services/pulumi-testbed` is an infrastructure testbed service.
- `docs` is the VitePress documentation site. It is intentionally excluded from root ESLint by `eslint.config.cjs`.

## Focused Runtime References

- `.agents/knowledge/micro-frontend.md` covers `packages/plugin-micro-frontend`, shared module registry behavior, and host/remote bundle flow.
- `.agents/knowledge/native-host-runtime.md` covers `packages/granite-screen`, Activity-owned host behavior, ReactHost creation, and `shared` bundle instance scope.

## Generated And Build Output

Build artifacts live in package `dist` directories and are produced by package scripts. Do not hand-edit generated output or `dist` files as a source of truth.

Granite app services may contain generated files such as `.granite/`, `.swc/`, and `src/router.gen.ts`. Treat generated files as evidence of current behavior, but prefer the generator or package script that owns them when changing behavior.

## Dependency And Version Model

The repo uses Yarn Plug'n'Play with `pnpFallbackMode: none`, so undeclared dependencies are not implicitly available. Shared dependency versions are centralized through Yarn catalogs in `.yarnrc.yml`, especially `react-native`, `swc`, and `tools`.

Use package-local dependencies and existing catalogs before adding new version literals.
