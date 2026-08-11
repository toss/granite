# Cross-Activity PoC Design System

## 1. Atmosphere & Identity

This PoC presents two intentionally unrelated services. The native `MainActivity` routes into them without owning React Native UI. A `ReactNativePotalHostActivity` instance whose URI host is `cross-activity-primary` feels like a warm, editorial retail app named Northstar Store. Another instance whose URI host is `cross-activity-secondary` feels like a compact, high-contrast finance app named Harbor Wallet. The Activity has no service-name or route mapping; it forwards any incoming URI host to the matching portal. The services share no visual surface; no React Native UI primitive or token crosses the service boundary.

## 2. Color

### Northstar Store

| Role           | Token                     | Value     | Usage                                |
| -------------- | ------------------------- | --------- | ------------------------------------ |
| Background     | `store.canvas`            | `#F6F0E5` | Screen background                    |
| Surface        | `store.paper`             | `#FFFDF8` | Product panel                        |
| Header         | `store.ink`               | `#203028` | Native-stack header and primary text |
| Muted text     | `store.muted`             | `#6F746D` | Supporting copy                      |
| Accent         | `store.terracotta`        | `#B44C2E` | Store actions                        |
| Accent pressed | `store.terracottaPressed` | `#8F3822` | Pressed action                       |
| Divider        | `store.divider`           | `#D9CCB9` | Product metadata separation          |

### Harbor Wallet

| Role           | Token                | Value     | Usage                       |
| -------------- | -------------------- | --------- | --------------------------- |
| Background     | `wallet.canvas`      | `#071A2C` | Screen background           |
| Surface        | `wallet.panel`       | `#0D2943` | Balance and transfer panels |
| Header         | `wallet.header`      | `#061422` | Native-stack header         |
| Primary text   | `wallet.text`        | `#F4F8FC` | Headings and values         |
| Muted text     | `wallet.muted`       | `#9DB2C7` | Supporting copy             |
| Accent         | `wallet.cyan`        | `#2FC6D5` | Wallet actions and status   |
| Accent pressed | `wallet.cyanPressed` | `#1A97A4` | Pressed action              |
| Divider        | `wallet.divider`     | `#1C4566` | Transaction separation      |

### Rules

- Store colors never appear in Wallet screens, and Wallet colors never appear in Store screens.
- Accent colors are reserved for interactive controls and key state.
- Raw color values in service code must correspond to a token above.

## 3. Typography

Both services use the Android system font so the PoC has no font asset dependency, but they use different hierarchy.

| Service | Role          | Size | Weight | Line height |
| ------- | ------------- | ---: | -----: | ----------: |
| Store   | Eyebrow       |   12 |    700 |          16 |
| Store   | Display       |   32 |    800 |          38 |
| Store   | Product title |   24 |    700 |          30 |
| Store   | Body          |   16 |    400 |          24 |
| Wallet  | Label         |   13 |    600 |          18 |
| Wallet  | Balance       |   38 |    700 |          44 |
| Wallet  | Heading       |   26 |    700 |          32 |
| Wallet  | Body          |   15 |    400 |          22 |

Numeric Store and Wallet state uses tabular figures.

## 4. Spacing & Layout

All spacing is based on 4 dp.

| Token     | Value | Usage                   |
| --------- | ----: | ----------------------- |
| `space.1` |     4 | Tight metadata          |
| `space.2` |     8 | Inline separation       |
| `space.3` |    12 | Compact vertical rhythm |
| `space.4` |    16 | Control padding         |
| `space.5` |    20 | Panel interior          |
| `space.6` |    24 | Screen gutter           |
| `space.8` |    32 | Major separation        |

- Store uses a left-aligned editorial column and squared product surfaces.
- Wallet uses a centered balance panel followed by full-width transaction actions.
- Both services must fit a 360 dp-wide Android device without horizontal clipping.

## 5. Components

No component is reusable across the two services.

### Store action

- **Structure**: Store-owned `Pressable` with a text label.
- **States**: terracotta default, darker pressed, disabled opacity when applicable.
- **Spacing**: `space.4` vertical, `space.5` horizontal.
- **Accessibility**: button role, descriptive label, minimum 48 dp touch height.
- **Layout**: full-width rectangle with 4 dp corner radius.

### Wallet action

- **Structure**: Wallet-owned `Pressable` with a text label.
- **States**: cyan default, darker pressed, disabled opacity when applicable.
- **Spacing**: `space.4` vertical, `space.5` horizontal.
- **Accessibility**: button role, descriptive label, minimum 48 dp touch height.
- **Layout**: full-width pill with 24 dp corner radius.

### Service panels

- Store product panel is paper-colored, asymmetric, and left-aligned.
- Wallet balance panel is dark tonal-shifted, centered, and data-first.
- The panels are intentionally separate implementations, not variants of one component.

## 6. Motion & Interaction

- Native-stack transitions provide route motion.
- Pressed feedback is an immediate color change only; no decorative animation.
- Store RN returns to the native `MainActivity` through the `/main` scheme and opens Harbor Wallet through `teleport-portal://cross-activity-secondary`.
- Android system back pops the focused service stack before closing its Activity.

## 7. Depth & Surface

- Strategy: tonal shift.
- Store depth uses cream-to-paper surface changes and one divider.
- Wallet depth uses navy-to-blue surface changes and one divider.
- No cross-service shadows, gradients, or shared elevation recipes.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- Body text contrast targets WCAG 2.2 AA.
- Every action exposes `accessibilityRole="button"` and visible text.
- Touch controls are at least 48 dp tall.
- Dynamic text may wrap; no fixed-height text containers.
- Navigation headers and system back provide an exit from every detail screen.

### Accepted Debt

| Item                    | Location         | Why accepted                                           | Owner / Exit                                                     |
| ----------------------- | ---------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| Android-only product QA | Activity hosting | Cross-Activity hosting is Android-specific in this PoC | Add a separate iOS host experiment only if product scope expands |
