/**
 * Color utility functions for Android compatibility
 *
 * React Native's normalizeColor returns colors in RRGGBBAA format for string inputs.
 * When user passes hex numbers directly, they're usually in AARRGGBB format.
 * Android expects colors in AARRGGBB format.
 * Codegen's Int32 requires signed integers for colors with alpha > 0x7F.
 */

// @ts-expect-error -- untyped RN API
import normalizeColor from '@react-native/normalize-colors';

// Convert RRGGBBAA (normalizeColor output) to AARRGGBB (Android format)
export const rgbaToArgb = (rgba: number): number => {
  const r = (rgba >>> 24) & 0xff;
  const g = (rgba >>> 16) & 0xff;
  const b = (rgba >>> 8) & 0xff;
  const a = rgba & 0xff;
  return ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
};

// Convert unsigned color to signed Int32 (for Codegen compatibility)
export const toSignedInt32 = (n: number): number =>
  n > 0x7fffffff ? n - 0x100000000 : n;

// Process color from normalizeColor output (RRGGBBAA -> AARRGGBB -> signed Int32)
export const processColor = (
  color: number | null | undefined,
  defaultColor: number = 0xff000000ff // Default: opaque black in RRGGBBAA
): number => {
  const rgba = typeof color === 'number' ? color : defaultColor;
  const argb = rgbaToArgb(rgba);
  return toSignedInt32(argb);
};

// Process color that's already in AARRGGBB format (just convert to signed Int32)
export const processArgbColor = (
  color: number | null | undefined,
  defaultColor: number = 0xff000000 // Default: opaque black in AARRGGBB
): number => {
  const argb = typeof color === 'number' ? color : defaultColor;
  return toSignedInt32(argb);
};

/**
 * Process raw color input from user (handles both string and number inputs)
 * - String colors (e.g., "#FF0000", "red") → normalize → RRGGBBAA → convert to AARRGGBB → signed
 * - Number colors (e.g., 0xFFFF0000) → assume AARRGGBB → just convert to signed
 */
export const processColorInput = (
  color: number | string | null | undefined,
  defaultColorArgb: number = 0xff000000 // Default in AARRGGBB format
): number => {
  if (color == null) {
    return toSignedInt32(defaultColorArgb);
  }

  if (typeof color === 'string') {
    // String color - normalize to RRGGBBAA, then convert to AARRGGBB
    const normalized = normalizeColor(color);
    if (normalized == null) {
      return toSignedInt32(defaultColorArgb);
    }
    const argb = rgbaToArgb(normalized);
    return toSignedInt32(argb);
  }

  // Number color - assume already in AARRGGBB format
  return toSignedInt32(color);
};
