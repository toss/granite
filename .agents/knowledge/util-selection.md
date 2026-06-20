# Util Selection Knowledge

이 문서는 Granite에서 파일 시스템, 경로, 프로세스 실행, CLI, 프롬프트, workspace 탐색, 설정 로딩, 데이터 변환을 다룰 때 현재 코드가 어떤 도구를 선택하는지 정리한다.

새 코드를 작성할 때는 아래 기준을 먼저 보고, 바로 옆 패키지의 기존 패턴을 다시 확인한다. 같은 기능을 여러 방식으로 처리하는 항목은 이 문서의 `Warning signals`에 남겨져 있으며, 동작을 정리하기 전에는 사용자에게 방향을 묻는다.

## General Rules

- generated, vendored, build output, cache 코드는 Granite 선택 기준으로 일반화하지 않는다.
- `packages/mpack/src/vendors/**`의 `yargs`, `cosmiconfig`, `fs-extra`, `graceful-fs`는 vendored Metro 사용처로만 본다.
- `dist`, `.granite`, `.swc`, `.vitest`, `coverage`, generated `router.gen.ts`, native typegen 출력은 패턴 근거에서 제외한다.
- CLI, plugin, RN runtime, native package, Gradle plugin, docs/service는 서로 다른 실행 경계다. 한 경계의 도구를 다른 경계에 강제로 통일하지 않는다.
- Node 파일·경로 작업은 기본적으로 Node core `fs`, `fs/promises`, `path`, `node:*` 모듈을 먼저 본다.
- repo 내부 package root와 `.granite` 작업 디렉터리는 가능하면 `@granite-js/utils`의 `getPackageRoot()`, `prepareLocalDirectory()`, `getLocalTempDirectoryPath()`를 재사용한다.

## Quick Selection

| 기능 | 현재 선택 기준 |
| --- | --- |
| `@granite-js/cli` public command | `clipanion.Cli`, `Command`, `Option` |
| `create-granite-app` public scaffolding CLI | `yargs(hideBin(process.argv))` + 누락값만 `@clack/prompts` |
| `forge-cli` deployment CLI | `@commander-js/extra-typings` + `@clack/prompts` |
| root `.scripts`의 작은 내부 CLI | 수동 `process.argv` parser 또는 shell `$1` |
| interactive prompt | `@clack/prompts`; `forge-cli`는 `handlePrompts()` wrapper 사용 |
| config file 탐색 | `packages/plugin-core`의 `loadConfig()`가 `c12.loadConfig()`에 위임 |
| plugin package root | `@granite-js/utils#getPackageRoot()` |
| `.granite` local dir | `@granite-js/utils#prepareLocalDirectory()` |
| workspace graph | root tooling은 `@nx/devkit#createProjectGraphAsync()` |
| workspace list JSON | root tooling은 `yarn workspaces list --json` 출력 파싱 |
| template package workspace | `packages/create-granite-app` script/test는 `workspace-tools#getYarnWorkspaces()`와 `findWorkspacePath()` |
| template file traversal | runtime copy는 `fs.readdir(..., { recursive: true })`, template version rewrite는 `fs.globSync()` |
| file watch | `packages/plugin-router`는 `chokidar.watch()` |
| zip content | `packages/utils`는 `yauzl` |
| process execution in JS packages | 주로 `execa(binary, args)` 또는 `execa` template `$` |
| process execution in root scripts | `execa`, `zx`, shell script가 공존 |
| process execution in Gradle plugin | Gradle `ExecOperations.exec()` 또는 `project.exec()` |
| Sentry CLI execution | `@sentry/cli`의 `SentryCLI.execute()` |
| stream gzip | Node `fs.createReadStream`, `fs.createWriteStream`, `stream.pipeline`, `zlib.createGzip()` |
| package/module resolution | `require.resolve(request, { paths })`, ESM 경계에서는 `createRequire()` 또는 `fileURLToPath(import.meta.url)` |
| config schema | `packages/plugin-core`는 `zod` |
| deployment input/S3 JSON schema | `infra/forge-cli`, `infra/deployment-manager`는 `valibot` |
| route param validation | `@standard-schema/spec` 계약과 함수 validator |
| case conversion | `es-toolkit`의 `kebabCase`, `pascalCase` |
| nullable filtering | `es-toolkit#isNotNil` |
| generic noop/delay | `es-toolkit#noop`, `asyncNoop`, `delay` |
| concurrency | `packages/mpack`은 `es-toolkit#Semaphore` |
| deep-ish merge | create app package merge는 `es-toolkit#merge`; plugin config 병합은 도메인별 직접 merge 함수 |
| canary selection | `infra/deployment-manager`는 `es-toolkit#range`, `shuffle` |
| debounce/throttle | `packages/react-native`는 `es-toolkit#debounce`, `throttle` |
| RN package build | `react-native-builder-bob`, `tsc`, package-local scripts |
| Brick native bridge | `brick-module`, `brick-codegen` |
| RN Codegen bridge | `codegenNativeComponent`, `codegenNativeCommands`, `TurboModuleRegistry` |
| iOS package metadata | Podspec에서 Ruby `JSON.parse(File.read(File.join(__dir__, "package.json")))` |
| Android/iOS provider flags | Gradle `System.getenv`/`project.findProperty`, Podspec `ENV.key?` |
| docs config | VitePress `defineConfig`, Node `createRequire`, `require.resolve`, `path` |
| service app page discovery | `require.context('./pages')`; Node glob/FS를 직접 돌리지 않음 |

## Area Notes

### Root Tooling

- Root scripts orchestrate Yarn 4, Nx, `tsx`, `node`, `rimraf`, and package-local tools from `package.json`.
- Workspace topology in `.scripts/utils/project.ts` uses `@nx/devkit#createProjectGraphAsync()` and project graph nodes/dependencies.
- Workspace list checks in `.scripts/check-exports.mts` and `.scripts/utils/licenses.mjs` use `yarn workspaces list --json` and parse JSON lines.
- Root path detection in `.scripts/utils/project.ts` walks upward from `process.cwd()` with Node `fs.existsSync()` and `path.dirname()`.
- Root process execution is mixed: `.scripts/check-exports.mts` and `.scripts/utils/project.ts` use `zx` template execution, `.scripts/utils/licenses.mjs` uses `execa`, and shell scripts use shell directly.
- Root `.scripts` do not use interactive prompts. They use `console`, `assert`, and `picocolors`.

### CLI Packages

- `packages/cli` declares public commands with `clipanion`; new `@granite-js/cli` commands should follow that local pattern.
- `packages/cli` delegates Granite config lookup to `@granite-js/plugin-core/loadConfig` rather than reimplementing config discovery.
- `packages/cli` runs external binaries with `execa(binary, args)` and removes optional args with `es-toolkit#isNotNil`.
- `packages/create-granite-app` uses `yargs` for public CLI args and `@clack/prompts` for missing values.
- `packages/create-granite-app` uses `es-toolkit/string#kebabCase` for app name normalization.
- `packages/create-granite-app` copies templates with Node `fs/promises` and `path`, and merges `package.json` with `es-toolkit#merge`.
- `packages/create-granite-app` uses `workspace-tools#getYarnWorkspaces()` in template version rewrite and tests.
- `infra/forge-cli` uses `@commander-js/extra-typings` for command/option declaration.
- `infra/forge-cli` uses `@clack/prompts` for intro/log/spinner/confirm/tasks/outro and routes prompt cancellation through `handlePrompts()`.
- `infra/forge-cli` compresses files with Node streams and `zlib`, not a third-party gzip package.
- `infra/forge-cli` validates deploy inputs with `valibot` and generates deployment IDs with `uuid.v7`.

### Plugin Packages

- `packages/plugin-core` is the config loading and merging source of truth.
- `packages/plugin-core` loads config with `c12`, validates config with `zod`, and writes Granite global files with Node `fs.writeFileSync()` plus `@granite-js/utils#prepareLocalDirectory()`.
- `packages/plugin-core` uses `es-toolkit#assert` and `isNotNil`, but config merge behavior is implemented by domain-specific merge functions rather than a general deep merge library.
- `packages/plugin-env` uses `@granite-js/utils#getPackageRoot()` and `prepareLocalDirectory()` before generating `.granite` runtime env files.
- `packages/plugin-env` uses sync Node `fs` writes for generated env artifacts and `ensureSafetyInvokeSync()` for optional `env.d.ts` generation.
- `packages/plugin-hermes` uses Node `fs/promises`, `path`, `require.resolve(..., { paths })`, `@granite-js/utils#getPackageRoot()`, `execa`, `source-map`, and `es-toolkit#isNotNil`.
- `packages/plugin-micro-frontend` writes prelude files with `prepareLocalDirectory()`, Node `path`, and `fs.writeFileSync()`.
- `packages/plugin-micro-frontend` treats runtime module requests as strings; its `normalizePath()` is not filesystem path normalization.
- `packages/plugin-router` assumes the current Granite app directory. It uses `process.cwd()`, fixed `pages`/`src/router.gen.ts` paths, Node `fs/path`, and `chokidar`.
- `packages/plugin-router` uses `@swc/core#parseFileSync()` when it needs to inspect route exports.
- `packages/plugin-router` uses `es-toolkit#pascalCase` and `kebabCase` for file/component naming.
- `packages/plugin-sentry` reads and writes sourcemaps with Node `fs/promises`.
- `packages/plugin-sentry` delegates external CLI execution to `@sentry/cli`'s `SentryCLI.execute()` rather than `child_process` or `execa`.
- `packages/plugin-sentry` uses `es-toolkit#noop` and `asyncNoop` for optional hooks.
- `packages/plugin-rozenite` uses `@granite-js/utils#getPackageRoot()` and passes the result to `@rozenite/middleware#initializeRozenite()`.

### Bundler And Test Runtime

- `packages/mpack` Granite code uses Node `fs`, `fs/promises`, `path`, `os.tmpdir()`, `require.resolve`, `enhanced-resolve`, and `es-toolkit`.
- `packages/mpack` uses `es-toolkit#Semaphore`, `toMerged`, `noop`, `delay`, `assert`, and `isNotNil` in bundling/runtime support.
- `packages/mpack` uses `execa` mostly in tests and fixture setup.
- `packages/mpack` workspace root detection is custom: PnP first, then parent `package.json.workspaces`, then `pnpm-workspace.yaml`.
- `packages/mpack` uses Node `readline.emitKeypressEvents()` and raw `stdin` for keyboard input instead of a prompt library.
- `packages/mpack/.scripts/copy-vendors-dts.mjs` uses `fast-glob` for vendored declaration copying only.
- `packages/vitest` uses Node `fs`, `path`, `os`, `crypto`, `module#createRequire()`, and `flow-remove-types`.
- `packages/vitest` materializes transform cache mostly with sync FS and runs garbage collection with async `fs.promises`.
- `packages/vitest` resolves PnP-safe package paths with `createRequire()` and `require.resolve()`.

### Core Runtime And Support Packages

- `packages/react-native` does not directly choose Node FS, process execution, CLI parser, prompt, or workspace traversal tools.
- `packages/react-native` delegates CLI entry to `@granite-js/cli.initialize()` and config API to `@granite-js/plugin-core#defineConfig`.
- `packages/react-native` receives route files through `require.context().keys()` and normalizes route paths with POSIX-like string functions, not Node `path`.
- `packages/react-native` uses `URLSearchParams`, `Object.fromEntries`, `JSON.parse`, and Standard Schema validation for route data.
- `packages/react-native` uses `es-toolkit#debounce` and `throttle` for UI event timing.
- `packages/utils` provides shared filesystem helpers using Node `fs` and `path` directly.
- `packages/utils#getPackageRoot()` walks upward from `process.cwd()` until it finds `package.json`.
- `packages/utils#prepareLocalDirectory()` creates the root `.granite` directory with `fs.mkdirSync(..., { recursive: true })`.
- `packages/utils` uses `yauzl` only for zip reading.
- `packages/jest` uses Node `fs.existsSync`, `path.resolve`, `path.join`, and `require.resolve(id, { paths: [rootDir] })`.
- `packages/babel-preset-granite` uses `require.resolve()` for Babel preset/plugin resolution and `@babel/core#transformSync()` in tests.

### RN Native Packages

- `packages/blur-view`, `packages/brownfield-module`, `packages/cookies`, `packages/image`, `packages/lottie`, `packages/naver-map`, and `packages/video` generally do not implement Node CLI or workspace traversal in runtime source.
- RN package build and declaration output are handled by `react-native-builder-bob`, `tsc`, package scripts, and package metadata.
- Brick packages such as `brownfield-module` and `cookies` rely on `brick-module` and `brick-codegen`.
- RN Codegen packages use `codegenConfig`, `codegenNativeComponent`, `codegenNativeCommands`, and native platform generated code.
- Podspec package metadata reads use Ruby `JSON.parse`, `File.read`, and `File.join(__dir__, "package.json")`.
- Example app Metro config uses Node `path.resolve`/`path.join`, `react-native-monorepo-config#withMetroConfig`, and React Native config helpers.
- Example app iOS Podfiles use `Pod::Executable.execute_command('node', ['-p', ...])` with Node `require.resolve` for hoisted script paths.
- Android build flags use Gradle `System.getenv`, `project.findProperty`, `rootProject.findProperty`, and `sourceSets`.
- Cross-bridge complex props in image, lottie, naver-map, and video are often serialized in JS with `JSON.stringify` and parsed in Android/iOS with platform JSON APIs.
- Native provider selection is platform-specific. Do not assume Android and iOS expose the same flags or provider registry shape.

### Gradle And Native Runtime

- `packages/granite-screen` Gradle plugin code uses Gradle Provider API for task inputs and outputs: `Property<File>`, `DirectoryProperty`, `RegularFileProperty`, `project.layout`.
- `packages/granite-screen` file operations inside Gradle tasks use Kotlin/JDK `File`, `mkdirs()`, `writeText()`, `copyTo()`, `inputStream()`, and `GZIPOutputStream`.
- `packages/granite-screen` executes processes with Gradle `ExecOperations.exec()` inside tasks and `project.exec()` during configuration-style work.
- `packages/granite-screen` parses JSON with `Gson` and reads properties with `java.util.Properties`.
- `packages/granite-screen` runtime native file reads use C++ POSIX `open`, `fstat`, `read`, and `close`.

### Infra Packages

- `infra/deployment-manager` centers on S3 object keys rather than local file paths.
- `infra/deployment-manager` uploads local bundle files with `fs.createReadStream()`.
- `infra/deployment-manager` wraps AWS SDK v3 commands behind its own S3 client helpers.
- `infra/deployment-manager` usually reads S3 JSON with `JSON.parse` followed by `valibot.parse`.
- `infra/deployment-manager` generates canary groups with `es-toolkit#range` and `shuffle`.
- `infra/pulumi-aws` uses sync Node `fs` and `path` for Pulumi asset preparation.
- `infra/pulumi-aws` uses `@granite-js/utils#getPackageRoot()` and `prepareLocalDirectory()` for local workspace output.
- `infra/pulumi-aws` resolves Lambda entries with `require.resolve('@granite-js/pulumi-aws/lambda/...')`.
- `infra/pulumi-aws` uses `oxc-transform` and `pulumi.asset.StringAsset` for Lambda code transform and constant injection.
- `infra/pulumi-aws` parses URI/S3 keys with small string utilities, not URL parser libraries.

### Docs And Services

- `docs` uses VitePress config utilities, static manifest import, Node `createRequire`, `require.resolve`, and `path`.
- `docs` does not directly parse CLI args or prompt users.
- `services/counter`, `services/showcase`, and `services/shared` do not implement file system, process execution, CLI parsing, prompt, or workspace traversal in app code.
- Service package scripts delegate to `granite`, `vitest`/`jest`, `tsc`, and `biome`.
- Service apps pass pages through `require.context('./pages')`.
- Service `react-native.config.js` files use CommonJS `require('path').dirname(require.resolve('react-native/package.json'))`.
- `services/pulumi-testbed` delegates execution to Pulumi CLI through Yarn PnP and reads config through `new pulumi.Config().require()`.

## Warning Signals

These are current-state mismatches. Report them before changing behavior and ask how to consolidate.

### Cross-Cutting

- CLI parser is split across `clipanion`, `yargs`, `@commander-js/extra-typings`, and manual `process.argv`.
- Process execution is split across `execa`, `zx`, shell scripts, `child_process.exec`, `SentryCLI.execute()`, and Gradle `ExecOperations`.
- Workspace discovery is split across `@granite-js/utils#getPackageRoot()`, `workspace-tools`, `@nx/devkit`, `yarn workspaces list --json`, `mpack` custom detection, and fixed `process.cwd()` assumptions.
- File traversal is split across `fs.readdir(..., { recursive: true })`, `fs.globSync`, `fast-glob`, sync `readdirSync`, and `chokidar`.
- Node import style is split across bare `fs`/`path`, `fs/promises`, and `node:*` imports.
- Sync and async FS are both common. Some packages use sync operations intentionally for cache materialization, plugin generation, and Gradle-like setup paths.
- Deletion/cleanup is split across `rimraf`, `del-cli`, `rm -rf`, `fs.rm`, and `fs.rmSync`.
- Lint entrypoints are split: root uses ESLint, while service package scripts use `biome check --write` and still keep local ESLint config files.
- Schema libraries are split: `zod` in `plugin-core`, `valibot` in deployment paths, Standard Schema in route params, and raw `JSON.parse` in some S3/package paths.
- Template replacement call sites are spread across `packages/create-granite-app/src/copyTemplate.ts`, `packages/plugin-router/src/generateRouterFile.ts`, and `packages/plugin-router/src/transformNewRouteFile.ts`; they use `@granite-js/utils#transformTemplate`.

### Package-Specific

- `docs/package.json` has `preview` using `npx serve`, which conflicts with Yarn PnP's declared-dependency expectation.
- `docs/.vitepress/utils.ts` uses `filter` for iteration and discards the return value.
- `infra/deployment-manager` builds with `tsup`, but a matching `tsdown.config.ts` also exists.
- `infra/deployment-manager` validates deployment state and cluster JSON with Valibot, but bundle list reads raw `JSON.parse`.
- `infra/deployment-manager` defines a `NoSuchKey` helper but some code checks `instanceof NoSuchKey` directly.
- `infra/forge-cli` reads S3 inputs differently between `deploy` and `deploy-list`.
- `packages/cli` declares dependencies such as `@inquirer/prompts`, `enquirer`, `ora`, `connect`, `zod`, `@granite-js/utils`, `@shopify/semaphore`, and `typanion` that current source imports do not show.
- `packages/cli` defines `parseError`, `isExist`, and `compressToGzip`, but active source call sites were not found.
- `packages/create-granite-app` public CLI uses `yargs`, while its internal template rewrite script reads `process.argv[2]` directly.
- `packages/create-granite-app` handles ESM dirname through `cwd.ts` in runtime code and direct `import.meta.dirname` in tests.
- `packages/native` scripts use both `node:fs` plus `fs.promises` and direct `node:fs/promises`.
- `packages/native` uses `child_process.exec` for a Yarn workspace command while nearby JS tooling often uses `execa`.
- `packages/plugin-core` sets `cwd` default in Zod, making the later `parsed.cwd ?? getPackageRoot()` fallback look unreachable.
- `packages/plugin-core` mixes `?? []` and `|| []` when defaulting merge arrays.
- `packages/plugin-core` has two similar `Object.create(null)` context creators.
- `packages/plugin-env` stringifies env values differently for Metro runtime script and esbuild define.
- `packages/plugin-env` throws naturally for runtime env file write failures but wraps `env.d.ts` generation with `ensureSafetyInvokeSync()`.
- `packages/plugin-hermes` and `packages/cli` both compile Hermes bytecode with different resolver assumptions.
- `packages/plugin-hermes` mixes `utf-8` and `utf8` encoding spelling in sourcemap file I/O.
- `packages/plugin-micro-frontend` declares `es-toolkit`, but source imports were not found.
- `packages/plugin-micro-frontend` uses `process.cwd()` for local dir setup, while nearby plugins use `getPackageRoot()`.
- `packages/plugin-micro-frontend` puts `path.resolve()` output into import strings; check Windows path behavior before copying that pattern.
- `packages/plugin-router` uses sync FS for full route generation and async FS for watcher-created file fixes.
- `packages/plugin-router` and `packages/create-granite-app` duplicate placeholder template replacement.
- `packages/plugin-router` uses `(values as any)` inside template replacement.
- `packages/plugin-rozenite` uses `as unknown as` for middleware type connection.
- `packages/plugin-sentry` declares `@granite-js/utils` and `execa`, but source imports were not found.
- `packages/mpack` mixes `fs`, `fs/promises`, and `node:fs/promises` imports.
- `packages/mpack` uses sync `fs.readdirSync` and `fs.lstatSync` inside an async `requireContextPlugin` path.
- `packages/mpack` `cleanupOutputDirectory` appears to wrap `directories.map(removeDir)` inside another array before `Promise.all`.
- `packages/utils` has different zip stream error handling between single-content and all-entry readers.
- `packages/utils` uses string accumulation for one zip path and `Buffer.concat` for all-entry reads.
- `packages/image` uses different cache policy names for view API and preload/source API.
- `packages/image` provider selection differs by platform: Android selects `okhttp`/`glide`/`coil`; iOS includes/excludes SDWebImage.
- `packages/lottie` references an `@granite-js/lottie-example` workspace and `example` paths that were not present in the current worktree.
- `packages/lottie` includes `react-native.config.js` in `files`, but that file was not present in the package root.
- `packages/naver-map` has different `lineJoin` numeric mappings between TS/iOS and Android.
- `packages/naver-map` repeats `as any` around Codegen command calls.
- `packages/video` accepts header data as object-to-array in JS while Android parses both `Map` and `List`.
- `packages/video` provider build flags differ by platform.
- `packages/vitest` intentionally mixes sync and async FS; do not flatten this into a single global FS rule.
- `services/counter`, `services/showcase`, and `services/shared` run Biome from package scripts while root lint remains ESLint.
- `services/counter` has `appName` mismatch between `granite.config.ts` and `src/_app.tsx`.
- `services/showcase` declares `valibot` and `zod`, but current source imports were not found.
- `services/showcase` mostly uses pass-through route validators despite declaring validation libraries.
- `services/pulumi-testbed` README still describes a template S3 bucket example while code uses `ReactNativeBundleCDN`.
- `services/pulumi-testbed` declares `@pulumi/awsx`, but source imports were not found.
