# @granite-js/forge-cli

A CLI tool for managing Granite applications.

## Deployment channels

Use `--channel` to keep deployments for the same application independent. Channel names are configurable,
case-sensitive strings containing 1–64 letters, digits, underscores or hyphens, starting with a letter or digit.
They are not derived from the React Native version and are never normalized.

```sh
granite-forge deploy --bucket sample-bucket --channel preview
```

The app name and built bundle directory come from the Granite config. AWS credentials and region are resolved
using the existing AWS provider chain. Both platform uploads must finish before the deployment is promoted.

To inspect history, pass the same channel to `deploy-list`, together with its existing S3 options:

```sh
granite-forge deploy-list --app-name sample-app --channel preview \
  --bucket sample-bucket --region "$AWS_REGION" \
  --access-key-id "$AWS_ACCESS_KEY_ID" --secret-access-key "$AWS_SECRET_ACCESS_KEY"
```

Include `--session-token "$AWS_SESSION_TOKEN"` when using temporary credentials.

Omitting `--channel` preserves the existing unscoped namespace. No named channel, including a channel named
`default`, aliases that namespace. Existing objects are not moved or copied.

| Scope              | Deployment state                                           | Bundle URL                                 |
| ------------------ | ---------------------------------------------------------- | ------------------------------------------ |
| Existing, unscoped | `deployments/sample-app/deployment_state`                  | `/ios/sample-app/1/bundle`                 |
| `preview`          | `channels/preview/deployments/sample-app/deployment_state` | `/ios/sample-app/1/bundle?channel=preview` |

Bundle objects, deployment history, stable/canary state and cluster pointers all use the same channel prefix.
The CDN keeps the existing `/<platform>/<app>/<group>/<suffix>` path and reads the channel from a single
`?channel=<name>` query parameter. Filename tags remain a separate feature; they do not select a channel.

## Native runtime selection

Configure the channel in the native app build that owns the runtime, then use it for every remote bundle request,
including the shared bundle and app bundles. Keep older binaries on their existing URLs while newer binaries
use their configured channel. A JS deployment cannot change the channel chosen by the native binary.

Deploy only bundles compatible with the native runtime assigned to that channel. Channels isolate delivery;
they do not compile bundles, infer runtime compatibility or validate the bytecode ABI. Release tooling must keep
the native build configuration and `--channel` value aligned.

Install and verify the channel-aware Lambda and S3 notifications before enabling channel URLs in native clients.
The old Lambda ignores query parameters and would serve the unscoped deployment. Clear pre-existing selector
caches before enabling clients if channel URLs have already been requested against the old Lambda.
With the updated handler, a missing deployment in a named channel returns 404 without falling back to the legacy
namespace or another channel. Native clients should handle that failure using their own compatible embedded
bundle or error handling.

See [the CDN documentation](../pulumi-aws/README.md#deployment-channels) for URL routing, cache isolation and
shared-bundle bootstrapping.
