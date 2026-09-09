---
'@granite-js/micro-frontend': patch
---

Mount teleported iOS Portal content under an `RCTRootComponentView` anchor so react-native-screens treats hosted screens as root-mounted and stops attaching a second `RCTSurfaceTouchHandler` per screen. Hosted content now gets a single touch handler and container-relative page coordinates, like content under a regular React Native root.
