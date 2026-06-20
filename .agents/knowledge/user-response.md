# Granite User Response Guide

## Response Scope

Keep this document focused on how to answer the user. Do not store repository architecture facts, API behavior, implementation notes, or package-specific details here. Put those in the relevant `.agents/knowledge/*` document instead.

## Structure Answers

When answering architecture, runtime, package, or API-surface questions, explicitly classify relevant packages, functions, config fields, and services as one of:

- `User surface API`: documented or exported APIs that Granite users are expected to call directly.
- `Internal`: implementation details used by Granite packages, generated code, native glue, build steps, or infrastructure.
- `Example`: sample apps, templates, testbeds, and docs examples that demonstrate how Granite is used.
- `Ambiguous`: exported or reachable code whose intended audience is unclear from docs or package exports. Explain the evidence and avoid assuming it is public.

For complex flows, name the workspace package that owns each step. Prefer concise tables and flow diagrams over long prose. Separate confirmed facts from inference when the code, docs, and package exports do not fully agree.

When answering in Korean, keep the wording natural and technical. Avoid stock AI summary phrases. Preserve exact names such as API, SDK, React Native, Granite, `shared`, and package paths.

When classifying Granite app roles in user-facing answers, use only `shared app` and `remote app`. Do not use alternate labels such as "general shared host app" or "Granite app" for that distinction.
