# Granite Agent Guide

## Project Overview

Granite is a Yarn 4 and Nx monorepo for an enterprise React Native framework. It provides the `@granite-js/react-native` runtime, ESBuild-based bundling, Granite plugins, native module packages, AWS deployment infrastructure, sample services, and VitePress documentation.

When you need to consult `react-native-brownfield`, use `~/projects/react-native-brownfield`.
`~/Downloads/gsample` is a sample project created with `granite-sample`.

## Tech Stack

- TypeScript is the main implementation language.
- React 19.2.3 and React Native 0.84.0 are pinned through Yarn catalogs in `.yarnrc.yml`.
- Yarn Plug'n'Play is enabled with `nodeLinker: pnp`; use `yarn` rather than npm or pnpm inside this repo.
- Nx runs cross-workspace build, typecheck, and test targets.
- Package builds use `tsdown`, `tsup`, `react-native-builder-bob`, TypeScript, and Gradle depending on the package.
- Tests use Vitest, Jest, and package-specific test scripts.
- Documentation is a VitePress app in `docs/`.

## Project Structure

```text
.
+-- packages/                  # Published Granite packages and plugins
|   +-- react-native/           # Core Granite React Native runtime and public entrypoints
|   +-- mpack/                  # ESBuild-based bundler and experimental dev server
|   +-- plugin-core/            # Granite config schema, plugin contracts, and config merging
|   +-- plugin-*/               # Official Granite build/dev plugins
|   +-- create-granite-app/     # App scaffolding CLI and templates
|   +-- native/                 # Native dependency facade package
+-- infra/                      # Deployment and infrastructure packages
|   +-- forge-cli/              # Deployment CLI
|   +-- deployment-manager/     # Deployment metadata helpers
|   +-- pulumi-aws/             # Pulumi AWS CDN and Lambda integration
+-- services/                   # Example, shared, showcase, and infrastructure testbed apps
+-- docs/                       # VitePress documentation site
+-- .agents/knowledge/          # Repo-local evergreen agent knowledge
+-- .scripts/                   # Repo-local maintenance and release scripts
+-- .github/workflows/          # CI, docs deployment, and release workflows
+-- nx.json                     # Nx target defaults and dependency behavior
+-- package.json                # Root workspace scripts
```

## Runtime And Architecture

Start with `.agents/knowledge/architecture.md` for package responsibilities and runtime entrypoints. Use `.agents/knowledge/micro-frontend.md` for Granite micro-frontend bundle sharing, and `.agents/knowledge/native-host-runtime.md` for Android/iOS host runtime behavior. Use `.agents/knowledge/user-response.md` when answering structure questions so package roles are classified clearly. For runtime code, begin at `packages/react-native/src/index.ts`, `packages/react-native/src/cli.ts`, `packages/mpack/src/index.ts`, `packages/plugin-core/src/index.ts`, and the relevant package `package.json` exports.

## Verification Commands

See `.agents/knowledge/verification.md` before choosing a command. Common entrypoints:

- `yarn build:all` runs Nx build targets and is the build baseline used by CI before lint, typecheck, and tests.
- `yarn lint` runs ESLint across the repo with the root ignore list.
- `yarn typecheck:all` runs Nx `typecheck` targets.
- `yarn test:all` runs both parallel and non-parallel Nx test targets.
- `yarn docs:build` from `docs/` builds the VitePress site.

## Design And UI Rules

Use `.agents/knowledge/design.md` for docs-site and React Native UI guidance. This repo contains user-facing docs, example apps, and React Native components; UI changes need source-level checks plus a rendered check when behavior or layout is meaningful.

## Knowledge Router

- `.agents/knowledge/user-response.md` covers how to answer Granite structure questions, including public API, internal, example, and ambiguous surface labels.
- `.agents/knowledge/architecture.md` covers package boundaries, runtime entrypoints, and cross-package ownership.
- `.agents/knowledge/micro-frontend.md` covers `packages/plugin-micro-frontend`, shared module registry behavior, and host/remote bundle flow.
- `.agents/knowledge/native-host-runtime.md` covers `packages/granite-screen`, Activity-owned host behavior, ReactHost creation, and `shared` bundle instance scope.
- `.agents/knowledge/verification.md` covers repo-native validation commands, CI coverage, and known blind spots.
- `.agents/knowledge/code-style.md` covers TypeScript, formatting, linting, package export, and dependency conventions.
- `.agents/knowledge/util-selection.md` covers which utility libraries and helper APIs Granite code chooses for CLI, filesystem, workspace, process, prompt, config, and data transformation work.
- `.agents/knowledge/design.md` covers documentation, sample app, and React Native UI expectations.

## Knowledge System

The root `AGENTS.md` is the entry point and router for Granite repo knowledge. Durable agent knowledge lives under `.agents/knowledge/*`.

When project structure, stable runtime entrypoints, verification commands, ownership boundaries, or durable repository contracts change enough to make these notes inaccurate, update this file and the relevant `.agents/knowledge/*` document in the same change.

Task-local scope, success criteria, verification criteria, temporary constraints, preferences, and examples are not durable repository knowledge unless the user explicitly makes them general or the repository changes make them current truth.

Current repository knowledge describes the existing state. Do not use it by itself to reject or discourage intentional functional or structural changes; update the affected knowledge after the change lands.
