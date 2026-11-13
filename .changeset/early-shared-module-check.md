---
'@granite-js/micro-frontend': patch
---

Check the shared modules a remote bundle uses before the bundle runs. The Rollipop plugin now adds an `intro` that throws `Shared module <name> is not registered` when the host has not registered a shared module that the bundle imports. Before, this error was thrown only when the module's facade was first required, so a remote that defers imports until their first use failed partway through rendering instead of while loading.
