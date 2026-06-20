# Design Knowledge

## UI Surfaces

Granite has three UI-facing areas:

- React Native components and runtime helpers in `packages/react-native/src/`.
- Example Granite apps in `services/*`.
- VitePress documentation in `docs/`.

## React Native UI Changes

Keep runtime component changes consistent with existing React Native patterns in `packages/react-native/src/`. Public component behavior should be verified with the nearest package test when one exists, or with a focused example/service check when runtime rendering is the meaningful risk.

Do not add user-visible copy that explains implementation constraints, prompt instructions, or agent policy. UI text should serve the product or documentation reader directly.

## Documentation Site Changes

Docs changes live under `docs/` and are built with VitePress. Use the existing docs structure and language split (`docs/` and `docs/ko/`) when editing documentation pages.

Run `yarn docs:build` from `docs/` for meaningful docs-site structure, routing, or component changes.

## Example App Changes

Example apps in `services/counter`, `services/shared`, and `services/showcase` use `granite.config.ts` and package-local build/typecheck/test scripts. Use those package scripts for focused validation when changing example app behavior.

## Browser Validation

Markdown-only repository knowledge edits do not need browser validation. Rendered UI, docs layout, or interactive behavior changes should be checked in a browser or app-equivalent environment when the local environment supports it.
