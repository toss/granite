# granite-release-profiler

CLI server for inspecting React Native release bundles with React Native DevTools and profiling tools.

The package starts a local server that exposes React Native DevTools inspector endpoints without serving a Metro development bundle. It is intended for apps that already load a built or remote release bundle, but still need DevTools, profiling, and tracing support during investigation.

## Features

- Starts a Fastify server with `@react-native/dev-middleware`.
- Exposes React Native DevTools endpoints such as `/json/list`, `/open-debugger`, and `/inspector/*`.
- Integrates Rozenite middleware, including the TanStack Query plugin.
- Writes collected tracing events to `tracing-events.json` when a `Tracing.tracingComplete` event is received.
- Responds to `/status` with `packager-status:profiler-only` so native Metro checks do not treat it as a running Metro server.

## Usage

Run the server with `npx`:

```bash
npx granite-release-profiler
```

Or install it globally:

```bash
npm install -g granite-release-profiler
granite-release-profiler
```

In this repository, you can run the package from the workspace:

```bash
yarn workspace granite-release-profiler start
```

By default, the server listens on `localhost:8081`.

## CLI Options

```bash
granite-release-profiler --host localhost --port 8081
```

- `--host`: Hostname to bind. Defaults to `localhost`.
- `--port`: Port to bind. Defaults to `8081`.

## Keyboard Shortcuts

When the server is running in an interactive terminal:

- `d`: Print the connected device list.
- `j`: Open the debugger for the first connected device.

## Current Limitations

- The server does not provide a Metro development bundle.
- Source inspection depends on sourcemaps being available from the loaded bundle.
- Network inspection may be limited by how the release bundle transforms or obfuscates request code.
