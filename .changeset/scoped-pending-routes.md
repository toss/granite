---
'@granite-js/micro-frontend': patch
---

Resolve pending host component routes against the calling bundle's container instead of the last evaluated app globals. Capture optional scheme and host metadata in new preludes, while retaining bundle-local configuration for older containers without that metadata.
