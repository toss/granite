---
'@granite-js/micro-frontend': patch
---

Put a detached portal source in the same measurement space React Native uses on Android.

A controller surface that is not attached to a window cannot read its own position, so the portal
offset was taken from the host origin and came out as zero. Fabric applies that offset as the
portal's transform, and that transform is what `measureInWindow` reports — the rendered position
comes from the host and never depended on it. The result was that a teleported subtree reported raw
screen coordinates while an ordinary window-attached surface reported coordinates relative to the
window's visible content area, the two disagreeing by the system bars inset. Anything consuming those
coordinates natively — an app bridge that draws at a measured rect, for one — landed a status bar
height off.

The detached branch now asks `RootViewUtil.getViewportOffset` about the host instead of deriving the
offset itself. That is the same call React Native makes to place a surface root, so the two stay in
one space without this package restating the rule. It also keeps them together as that function
changes: through 0.85 it subtracts the visible display frame, while 0.86 subtracts `WindowInsetsCompat`
status bar and cutout insets and skips the subtraction entirely under edge-to-edge.

Rendering and touch are unaffected. The teleported children are parented by the host, so they draw
where the host puts them, and the touch path that dispatches to them does not follow this offset.
