import type { ViewStyle } from 'react-native';

interface BoxSpacingOptionObject {
  x?: never;
  y?: never;
  top?: never;
  bottom?: never;
  left?: never;
  right?: never;
}

type BoxSpacingOptionObjectCase<Option extends keyof BoxSpacingOptionObject> = {
  [O in Option]?: number;
} & {
  [P in Exclude<keyof BoxSpacingOptionObject, Option>]?: never;
};

export type BoxSpacingOption =
  | BoxSpacingOptionObjectCase<'x' | 'y'>
  | BoxSpacingOptionObjectCase<'x' | 'top' | 'bottom'>
  | BoxSpacingOptionObjectCase<'y' | 'left' | 'right'>
  | BoxSpacingOptionObjectCase<'top' | 'right' | 'bottom' | 'left'>
  | number;

export function spacing(styleProperty: string, option: BoxSpacingOption): ViewStyle {
  if (typeof option === 'number') {
    return {
      [styleProperty]: option,
    };
  }

  const box: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  } = {};

  if (option.x !== undefined) {
    box.left = box.right = option.x;
  }
  if (option.y !== undefined) {
    box.top = box.bottom = option.y;
  }
  if (option.top !== undefined) {
    box.top = option.top;
  }
  if (option.right !== undefined) {
    box.right = option.right;
  }
  if (option.bottom !== undefined) {
    box.bottom = option.bottom;
  }
  if (option.left !== undefined) {
    box.left = option.left;
  }

  /** Changes margin left to marginLeft */
  const styleObject = Object.entries(box).reduce((_styleObject, [dir, value]) => {
    return {
      ..._styleObject,
      [`${styleProperty}${capitalizeFirstLetter(dir)}`]: value,
    };
  }, {});

  return styleObject;
}

type Property = 'x' | 'y' | 'top' | 'right' | 'bottom' | 'left';
type Unit = '4' | '8' | '12' | '16' | '24' | '32';

export interface BoxSpacingPresets {
  readonly x: (value: number) => ViewStyle;
  readonly x4: ViewStyle;
  readonly x8: ViewStyle;
  readonly x12: ViewStyle;
  readonly x16: ViewStyle;
  readonly x24: ViewStyle;
  readonly x32: ViewStyle;

  readonly y: (value: number) => ViewStyle;
  readonly y4: ViewStyle;
  readonly y8: ViewStyle;
  readonly y12: ViewStyle;
  readonly y16: ViewStyle;
  readonly y24: ViewStyle;
  readonly y32: ViewStyle;

  readonly top: (value: number) => ViewStyle;
  readonly top4: ViewStyle;
  readonly top8: ViewStyle;
  readonly top12: ViewStyle;
  readonly top16: ViewStyle;
  readonly top24: ViewStyle;
  readonly top32: ViewStyle;

  readonly right: (value: number) => ViewStyle;
  readonly right4: ViewStyle;
  readonly right8: ViewStyle;
  readonly right12: ViewStyle;
  readonly right16: ViewStyle;
  readonly right24: ViewStyle;
  readonly right32: ViewStyle;

  readonly bottom: (value: number) => ViewStyle;
  readonly bottom4: ViewStyle;
  readonly bottom8: ViewStyle;
  readonly bottom12: ViewStyle;
  readonly bottom16: ViewStyle;
  readonly bottom24: ViewStyle;
  readonly bottom32: ViewStyle;

  readonly left: (value: number) => ViewStyle;
  readonly left4: ViewStyle;
  readonly left8: ViewStyle;
  readonly left12: ViewStyle;
  readonly left16: ViewStyle;
  readonly left24: ViewStyle;
  readonly left32: ViewStyle;
}

export interface BoxSpacing extends BoxSpacingPresets {
  (option: BoxSpacingOption): ViewStyle;
}

const properties: Property[] = ['x', 'y', 'top', 'right', 'bottom', 'left'];
const units: Unit[] = ['4', '8', '12', '16', '24', '32'];

function createSpacingWithProperty(cssProperty: string) {
  const _spacing = (option: BoxSpacingOption) => spacing(cssProperty, option);

  for (const property of properties) {
    (_spacing as any)[property] = (value: number) => spacing(cssProperty, { [property]: value });
    for (const unit of units) {
      const key = `${property}${unit}` as keyof BoxSpacingPresets;

      (_spacing as any)[key] = _spacing({
        [property]: Number(unit),
      });
    }
  }

  return _spacing as BoxSpacing;
}

/**
 * @public
 * @category UI
 * @name padding
 * @description
 * The `padding` function sets the inner spacing of a component to create appropriate spacing between content and boundaries. You can specify horizontal (x), vertical (y), and individual direction (top, right, bottom, left) spacing using numbers.
 * You can apply the same value to all directions by entering a number, or set individual values for each direction. There are also presets for commonly used values for easy application.
 *
 * @param {BoxSpacingOption} option - The option value to specify inner spacing. If you enter a number, it applies the same value to all directions,
 * or you can set individual values for each direction.
 * @property {(value: number) => ViewStyle} x - Returns a style object that sets the inner spacing of the component's horizontal direction (left and right) by the input number. The returned object is passed to the component's `style` property to apply the spacing.
 * @property {ViewStyle} x4 - A style object that applies 4px inner spacing in the horizontal direction
 * @property {ViewStyle} x8 - A style object that applies 8px inner spacing in the horizontal direction
 * @property {ViewStyle} x12 - A style object that applies 12px inner spacing in the horizontal direction
 * @property {ViewStyle} x16 - A style object that applies 16px inner spacing in the horizontal direction
 * @property {ViewStyle} x24 - A style object that applies 24px inner spacing in the horizontal direction
 * @property {ViewStyle} x32 - A style object that applies 32px inner spacing in the horizontal direction
 * @property {(value: number) => ViewStyle} y - Returns a style object that sets the inner spacing of the component's vertical direction (top and bottom) by the input number. The returned object is passed to the component's `style` property to apply the spacing.
 * @property {ViewStyle} y4 - A style object that applies 4px inner spacing in the vertical direction
 * @property {ViewStyle} y8 - A style object that applies 8px inner spacing in the vertical direction
 * @property {ViewStyle} y12 - A style object that applies 12px inner spacing in the vertical direction
 * @property {ViewStyle} y16 - A style object that applies 16px inner spacing in the vertical direction
 * @property {ViewStyle} y24 - A style object that applies 24px inner spacing in the vertical direction
 * @property {ViewStyle} y32 - A style object that applies 32px inner spacing in the vertical direction
 * @property {(value: number) => ViewStyle} top - Returns a style object that sets the inner spacing of the component's top direction by the input number. The returned object is passed to the component's `style` property to apply the spacing.
 * @property {ViewStyle} top4 - A style object that applies 4px inner spacing to the top
 * @property {ViewStyle} top8 - A style object that applies 8px inner spacing to the top
 * @property {ViewStyle} top12 - A style object that applies 12px inner spacing to the top
 * @property {ViewStyle} top16 - A style object that applies 16px inner spacing to the top
 * @property {ViewStyle} top24 - A style object that applies 24px inner spacing to the top
 * @property {ViewStyle} top32 - A style object that applies 32px inner spacing to the top
 * @property {(value: number) => ViewStyle} right - Returns a style object that sets the inner spacing of the component's right direction by the input number. The returned object is passed to the component's `style` property to apply the spacing.
 * @property {ViewStyle} right4 - A style object that applies 4px inner spacing to the right
 * @property {ViewStyle} right8 - A style object that applies 8px inner spacing to the right
 * @property {ViewStyle} right12 - A style object that applies 12px inner spacing to the right
 * @property {ViewStyle} right16 - A style object that applies 16px inner spacing to the right
 * @property {ViewStyle} right24 - A style object that applies 24px inner spacing to the right
 * @property {ViewStyle} right32 - A style object that applies 32px inner spacing to the right
 * @property {(value: number) => ViewStyle} bottom - Returns a style object that sets the inner spacing of the component's bottom direction by the input number. The returned object is passed to the component's `style` property to apply the spacing.
 * @property {ViewStyle} bottom4 - A style object that applies 4px inner spacing to the bottom
 * @property {ViewStyle} bottom8 - A style object that applies 8px inner spacing to the bottom
 * @property {ViewStyle} bottom12 - A style object that applies 12px inner spacing to the bottom
 * @property {ViewStyle} bottom16 - A style object that applies 16px inner spacing to the bottom
 * @property {ViewStyle} bottom24 - A style object that applies 24px inner spacing to the bottom
 * @property {ViewStyle} bottom32 - A style object that applies 32px inner spacing to the bottom
 * @property {(value: number) => ViewStyle} left - Returns a style object that sets the inner spacing of the component's left direction by the input number. The returned object is passed to the component's `style` property to apply the spacing.
 * @property {ViewStyle} left4 - A style object that applies 4px inner spacing to the left
 * @property {ViewStyle} left8 - A style object that applies 8px inner spacing to the left
 * @property {ViewStyle} left12 - A style object that applies 12px inner spacing to the left
 * @property {ViewStyle} left16 - A style object that applies 16px inner spacing to the left
 * @property {ViewStyle} left24 - A style object that applies 24px inner spacing to the left
 * @property {ViewStyle} left32 - A style object that applies 32px inner spacing to the left
 *
 * @example
 * ### Example of applying 8px inner spacing in horizontal and vertical directions, and 100px spacing in the bottom direction
 *
 * ```tsx
 * import { padding } from '@granite-js/react-native';
 * import { View } from 'react-native';
 *
 * function Component() {
 *   return (
 *     <View>
 *       <View style={padding.x8}>
 *         <Text>Has horizontal spacing</Text>
 *       </View>
 *       <View style={padding.y8}>
 *         <Text>Has vertical spacing</Text>
 *       </View>
 *       <View style={padding.bottom(100)}>
 *         <Text>Has 100px spacing at the bottom</Text>
 *       </View>
 *     </View>
 *   );
 * }
 * ```
 */
export const padding = createSpacingWithProperty('padding');

/**
 * @public
 * @category UI
 * @name margin
 * @description
 * The `margin` function sets the outer spacing of a component to create appropriate spacing between components. You can specify horizontal (x), vertical (y), and individual direction (top, right, bottom, left) spacing using numbers.
 * You can apply the same value to all directions by entering a number, or set individual values for each direction. There are also presets for commonly used values for easy application.
 *
 * @param {BoxSpacingOption} option - The option value to specify outer spacing. If you enter a number, it applies the same value to all directions,
 * or you can set individual values for each direction.
 * @property {(value: number) => ViewStyle} x - Returns a style object that sets the outer spacing of the component's horizontal direction (left and right) by the input number. The returned object is passed to the component's `style` property to apply the spacing.
 * @property {ViewStyle} x4 - A style object that applies 4px outer spacing in the horizontal direction
 * @property {ViewStyle} x8 - A style object that applies 8px outer spacing in the horizontal direction
 * @property {ViewStyle} x12 - A style object that applies 12px outer spacing in the horizontal direction
 * @property {ViewStyle} x16 - A style object that applies 16px outer spacing in the horizontal direction
 * @property {ViewStyle} x24 - A style object that applies 24px outer spacing in the horizontal direction
 * @property {ViewStyle} x32 - A style object that applies 32px outer spacing in the horizontal direction
 * @property {(value: number) => ViewStyle} y - Returns a style object that sets the outer spacing of the component's vertical direction (top and bottom) by the input number. The returned object is passed to the component's `style` property to apply the spacing.
 * @property {ViewStyle} y4 - A style object that applies 4px outer spacing in the vertical direction
 * @property {ViewStyle} y8 - A style object that applies 8px outer spacing in the vertical direction
 * @property {ViewStyle} y12 - A style object that applies 12px outer spacing in the vertical direction
 * @property {ViewStyle} y16 - A style object that applies 16px outer spacing in the vertical direction
 * @property {ViewStyle} y24 - A style object that applies 24px outer spacing in the vertical direction
 * @property {ViewStyle} y32 - A style object that applies 32px outer spacing in the vertical direction
 * @property {(value: number) => ViewStyle} top - Returns a style object that sets the outer spacing of the component's top direction by the input number. The returned object is passed to the component's `style` property to apply the spacing.
 * @property {ViewStyle} top4 - A style object that applies 4px outer spacing to the top
 * @property {ViewStyle} top8 - A style object that applies 8px outer spacing to the top
 * @property {ViewStyle} top12 - A style object that applies 12px outer spacing to the top
 * @property {ViewStyle} top16 - A style object that applies 16px outer spacing to the top
 * @property {ViewStyle} top24 - A style object that applies 24px outer spacing to the top
 * @property {ViewStyle} top32 - A style object that applies 32px outer spacing to the top
 * @property {(value: number) => ViewStyle} right - Returns a style object that sets the outer spacing of the component's right direction by the input number. The returned object is passed to the component's `style` property to apply the spacing.
 * @property {ViewStyle} right4 - A style object that applies 4px outer spacing to the right
 * @property {ViewStyle} right8 - A style object that applies 8px outer spacing to the right
 * @property {ViewStyle} right12 - A style object that applies 12px outer spacing to the right
 * @property {ViewStyle} right16 - A style object that applies 16px outer spacing to the right
 * @property {ViewStyle} right24 - A style object that applies 24px outer spacing to the right
 * @property {ViewStyle} right32 - A style object that applies 32px outer spacing to the right
 * @property {(value: number) => ViewStyle} bottom - Returns a style object that sets the outer spacing of the component's bottom direction by the input number. The returned object is passed to the component's `style` property to apply the spacing.
 * @property {ViewStyle} bottom4 - A style object that applies 4px outer spacing to the bottom
 * @property {ViewStyle} bottom8 - A style object that applies 8px outer spacing to the bottom
 * @property {ViewStyle} bottom12 - A style object that applies 12px outer spacing to the bottom
 * @property {ViewStyle} bottom16 - A style object that applies 16px outer spacing to the bottom
 * @property {ViewStyle} bottom24 - A style object that applies 24px outer spacing to the bottom
 * @property {ViewStyle} bottom32 - A style object that applies 32px outer spacing to the bottom
 * @property {(value: number) => ViewStyle} left - Returns a style object that sets the outer spacing of the component's left direction by the input number. The returned object is passed to the component's `style` property to apply the spacing.
 * @property {ViewStyle} left4 - A style object that applies 4px outer spacing to the left
 * @property {ViewStyle} left8 - A style object that applies 8px outer spacing to the left
 * @property {ViewStyle} left12 - A style object that applies 12px outer spacing to the left
 * @property {ViewStyle} left16 - A style object that applies 16px outer spacing to the left
 * @property {ViewStyle} left24 - A style object that applies 24px outer spacing to the left
 * @property {ViewStyle} left32 - A style object that applies 32px outer spacing to the left
 *
 * @example
 * ### Example of applying 8px outer spacing in horizontal and vertical directions, and 100px spacing in the bottom direction
 *
 * ```tsx
 * import { margin } from '@granite-js/react-native';
 * import { View } from 'react-native';
 *
 * function Component() {
 *   return (
 *     <View>
 *       <View style={margin.x8}>
 *         <Text>Has horizontal spacing</Text>
 *       </View>
 *       <View style={margin.y8}>
 *         <Text>Has vertical spacing</Text>
 *       </View>
 *       <View style={margin.bottom(100)}>
 *         <Text>Has 100px spacing at the bottom</Text>
 *       </View>
 *     </View>
 *   );
 * }
 * ```
 */
export const margin = createSpacingWithProperty('margin');

function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
