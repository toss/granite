---
'@granite-js/cookies': patch
---

Fix `expires` date parsing in the native cookie modules. ISO 8601 strings with milliseconds — the exact output of JavaScript's `Date.prototype.toISOString()` (e.g. `2024-01-01T00:00:00.000Z`) — failed to parse on iOS (`ISO8601DateFormatter` without `.withFractionalSeconds`) and on Android (`SimpleDateFormat` zone letters cannot match the literal `Z` suffix). Worse, both platforms silently dropped the `expires` attribute on parse failure, so the cookie was stored as a session cookie without any error. Now both platforms parse ISO 8601 with and without milliseconds, and `set` rejects an unparseable `expires` value with a descriptive error instead of silently creating a session cookie.
