import { debounce } from 'es-toolkit';
import { PropsWithChildren, ReactElement, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { InView, IOContext } from '../intersection-observer';
import { noop } from '../utils/noop';
import { usePreservedCallback } from '../utils/usePreservedCallback';
import { useVisibility } from '../visibility';

interface Props {
  onImpressionStart?: () => void;
  onImpressionEnd?: () => void;
  enabled?: boolean;
  UNSAFE__impressFallbackOnMount?: boolean;
  style?: StyleProp<ViewStyle>;
  areaThreshold?: number;
  timeThreshold?: number;
  children?: ReactNode;
}

/**
 * @public
 * @category Screen Control
 * @name ImpressionArea
 * @description
 * A component that detects whether a specific component is visible on the screen and notifies the outside. Using this component, you can easily implement features like collecting logs or running animations when a specific component becomes visible on the screen.
 * The visibility is detected using the return value of `useVisibility` and the `IOScrollView` and `InView` components that indicate whether the component is displayed within the viewport. When using `ScrollView` in React, even if a view is not visible on the screen, using `ImpressionArea` allows you to trigger events only when the view is actually visible on the screen.

::: info Note

`ImpressionArea` must be used inside `IOScrollView`. If you need to use it outside of `IOScrollView`, you can set the `UNSAFE__impressFallbackOnMount` property to `true` to detect based on when the component is mounted. If this property is set to `false` and used outside of `IOScrollView`, an `IOProviderMissingError` will occur.

:::
 *
 * @param {() => void} [onImpressionStart] Callback function that is executed when the child component becomes visible on the screen.
 * @param {() => void} [onImpressionEnd] Callback function that is executed when the child component is hidden from the screen.
 * @param {boolean} [enabled=true] Value that directly controls the condition for visibility. Default value is `true`. If passed as `false`, the `onImpressionStart` callback function will not be executed even if the component is visible.
 * @param {number} [areaThreshold=0] Value that sets the ratio of the visible area. If the component appears on the screen with a ratio greater than this value, `onImpressionStart` is called.
 * The value should be set between 0 and 1. Setting it to 0 triggers the event when even 1px of the component is visible. Conversely, setting it to 1 only triggers the event when the component is 100% visible on the screen.
 * @param {number} [timeThreshold=0] Sets the time in milliseconds before `onImpressionStart` is called after this component becomes visible on the screen. Default value is `0` milliseconds (0 seconds).
 * @param {ViewStyle} [style] `style` value to be applied to the `InView` component. Default value is `undefined`, used when you want to specify a style.
 * @param {boolean} [UNSAFE__impressFallbackOnMount=false] Whether to consider the component as visible immediately when mounted. Default value is `false`.
 * Useful when you cannot determine if the component is in the viewport without using `IOScrollView`. For example, a component located outside of `IOScrollView` will be considered visible at mount time if set to `true`.
 *
 * @returns {ReactElement} - Returns a component that can detect visibility on the screen.
 * @example
 * 
 * ### Basic Usage Example
 * 
 * ```tsx
 * import { useState } from 'react';
 * import { Button, Dimensions, Text, View } from 'react-native';
 * import { ImpressionArea, IOScrollView } from '@granite-js/react-native';
 * 
 * export default function ImpressionAreaExample() {
 *  const [isImpressionStart, setIsImpressionStart] = useState(false);
 * 
 *  return (
 *    <>
 *      <Text>{isImpressionStart ? 'Impression Start' : 'Impression End'}</Text>
 *        <IOScrollView
 *          style={{
 *            flex: 1,
 *            margin: 16,
 *            backgroundColor: 'white',
 *          }}
 *        >
 *        <View
 *          style={{
 *            height: Dimensions.get('screen').height,
 *            borderWidth: 1,
 *            borderColor: 'black',
 *          }}
 *        >
 *          <Text>Scroll to here</Text>
 *        </View>
 * 
 *        <ImpressionArea
 *          onImpressionStart={() => setIsImpressionStart(true)}
 *          onImpressionEnd={() => setIsImpressionStart(false)}
 *        >
 *          <Button title="Button" />
 *        </ImpressionArea>
 *      </IOScrollView>
 *    </>
 *  );
 * }
 * ```
 *
 * ### Example of Detection at Mount Time
 * 
 * When `ImpressionArea` is not located inside a component like `IOScrollView`, setting `UNSAFE__impressFallbackOnMount` to `true` will consider the component as visible when it is mounted.
 * 
 * ```tsx
 * import { useState } from 'react';
 * import { Button, Dimensions, ScrollView, Text, View } from 'react-native';
 * import { ImpressionArea } from '@granite-js/react-native';
 * 
 * export default function ImpressionArea2Example() {
 *  const [isImpressionStart, setIsImpressionStart] = useState(false);
 * 
 *  return (
 *    <>
 *      <Text>{isImpressionStart ? 'Impression Start' : 'Impression End'}</Text>
 *      <ScrollView
 *        style={{
 *          flex: 1,
 *          margin: 16,
 *          backgroundColor: 'white',
 *        }}
 *      >
 *        <View
 *          style={{
 *            height: Dimensions.get('screen').height,
 *            borderWidth: 1,
 *            borderColor: 'black',
 *          }}
 *        >
 *          <Text>Scroll to here</Text>
 *        </View>
 * 
 *        <ImpressionArea
 *          UNSAFE__impressFallbackOnMount={true}
 *          onImpressionStart={() => setIsImpressionStart(true)}
 *          onImpressionEnd={() => setIsImpressionStart(false)}
 *        >
 *          <Button title="Button" />
 *        </ImpressionArea>
 *      </ScrollView>
 *    </>
 *  );
 * }
 * ```
 */
export function ImpressionArea(props: Props): ReactElement {
  const context = useContext(IOContext);

  if (context?.manager == null && props.UNSAFE__impressFallbackOnMount) {
    return <ImpressionAreaOnMount {...props} />;
  }

  return <ImpressionAreaWithIntersectionObserver {...props} />;
}

export class IOProviderMissingError extends Error {
  message =
    'ImpressionArea가 IOContext.Provider 밖에서 사용되었습니다. ' +
    '최상위 ScrollView가 @granite-js/react-native의 IOScrollView인지 확인해주세요.';
}

/**
 * @category Components
 * @kind function
 * @name ImpressionAreaOnMount
 * @description
 * A component that calls `onImpressionStart` and `onImpressionEnd` when the component is mounted on the screen.
 * Used when `UNSAFE__impressFallbackOnMount` is `true` in `ImpressionArea`.
 * This component can be used when `ImpressionArea` is needed outside of `IOScrollView`.
 *
 * @param {() => void} [onImpressionStart] - Callback function that is called when the component is mounted.
 * @param {() => void} [onImpressionEnd] - Callback function that is called when the component is unmounted.
 * @param {StyleProp<ViewStyle>} [style] - Sets the style of the top-level container of the `ImpressionAreaOnMount` component.
 * @param {ReactNode} [children] - Sets the child components to be wrapped by `ImpressionAreaOnMount`.
 * @returns {ReactElement} - Returns a component that detects mount status
 * @example
 * ### Example of Detection at Mount Time
 * ```tsx
 * import { ImpressionAreaOnMount } from '@granite-js/react-native';
 *
 * export default function AlwaysImpressionAreaPage() {
 *   // isImpressionStart is set to true when AlwaysImpressionAreaPage is mounted
 *   const [isImpressionStart, setIsImpressionStart] = useState(false);
 *
 *   return (
 *     <ScrollView
 *       style={{
 *         flex: 1,
 *         padding: 16,
 *         backgroundColor: 'white',
 *       }}
 *     >
 *       <TestTitle title="ImpressionArea" description="@granite-js/impression-area" />
 *       <Button label={'Scroll to origin'} onPress={() => {}} />
 *       <Code style={{ width, height }} json={{ isImpressionStart }} />
 *       <ImpressionAreaOnMount
 *         onImpressionStart={() => setIsImpressionStart(true)}
 *         onImpressionEnd={() => setIsImpressionStart(false)}
 *       >
 *         <Button label={'Scroll to here'} onPress={() => {}} />
 *       </ImpressionArea>
 *     </ScrollView>
 *   );
 * }
 * ```
 */
export function ImpressionAreaOnMount({
  onImpressionStart: _onImpressionStart = noop,
  onImpressionEnd: _onImpressionEnd = noop,
  style,
  children,
}: PropsWithChildren<Props>): ReactElement {
  const visible = useVisibility();

  const isImpressed = visible;

  const onImpressionStart = usePreservedCallback(_onImpressionStart);
  const onImpressionEnd = usePreservedCallback(_onImpressionEnd);

  useEffect(() => {
    if (isImpressed) {
      onImpressionStart();
    } else {
      onImpressionEnd();
    }
  }, [isImpressed, onImpressionStart, onImpressionEnd]);

  return <View style={style}>{children}</View>;
}

/**
 * @category Components
 * @kind function
 * @name ImpressionAreaWithIntersectionObserver
 * @description
 * A component that calls `onImpressionStart` and `onImpressionEnd` based on whether the component is visible on the user's screen.
 * This is a component that can be used in `IOScrollView` and can notify the outside about its visibility status.
 *
 * @param {() => void} [onImpressionStart] - Callback function that is called when the component becomes visible on the screen.
 * @param {() => void} [onImpressionEnd] - Callback function that is called when the component disappears from the screen.
 * @param {boolean} [enabled=true] - Sets whether to enable `ImpressionArea`.
 * @param {StyleProp<ViewStyle>} [style] - Sets the style of the top-level container of the `ImpressionAreaWithIntersectionObserver` component.
 * @param {number} [areaThreshold=0] - Considers the component visible when its visible area exceeds the set ratio.
 * @param {number} [timeThreshold=0] - Sets the time in milliseconds before `onImpressionStart` and `onImpressionEnd` are called after the component becomes visible on the screen. Default value is `0` milliseconds.
 * @param {ReactNode} [children] - Sets the child components to be wrapped by `ImpressionAreaWithIntersectionObserver`.
 * @returns {ReactElement} - Returns a component that can detect visibility on the screen.
 * @example
 * ### Example using IntersectionObserver
 * ```tsx
 * import { ImpressionAreaWithIntersectionObserver, IOScrollView } from '@granite-js/react-native';
 *
 * export default function ImpressionAreaPage() {
 *   const [isImpressionStart, setIsImpressionStart] = useState(false);
 *
 *   return (
 *     <IOScrollView
 *       style={{
 *         flex: 1,
 *         margin: 16,
 *         backgroundColor: 'white',
 *       }}
 *     >
 *       <TestTitle title="ImpressionArea" description="@granite-js/impression-area" />
 *       <Button label={'Scroll to origin'} onPress={() => {}} />
 *       <Code style={{ width, height }} textStyle={{ flex: 1, verticalAlign: 'middle' }} json={{ isImpressionStart }} />
 *       <ImpressionAreaWithIntersectionObserver
 *         onImpressionStart={() => setIsImpressionStart(true)}
 *         onImpressionEnd={() => setIsImpressionStart(false)}
 *       >
 *         <Button label={'Scroll to here'} onPress={() => {}} />
 *       </ImpressionArea>
 *     </IOScrollView>
 *   );
 * }
 * ```
 */
export function ImpressionAreaWithIntersectionObserver({
  onImpressionStart: _onImpressionStart = noop,
  onImpressionEnd: _onImpressionEnd = noop,
  timeThreshold = 0,
  ...props
}: PropsWithChildren<{
  onImpressionStart?: () => void;
  onImpressionEnd?: () => void;
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
  areaThreshold?: number;
  timeThreshold?: number;
}>): ReactElement {
  const [isImpressed, setIsImpressed] = useState(false);

  const onImpressionChange = useMemo(() => {
    if (timeThreshold === 0) {
      return setIsImpressed;
    } else {
      return debounce(setIsImpressed, timeThreshold);
    }
  }, [setIsImpressed, timeThreshold]);

  const onImpressionStart = usePreservedCallback(_onImpressionStart);
  const onImpressionEnd = usePreservedCallback(_onImpressionEnd);

  useEffect(() => {
    if (isImpressed) {
      onImpressionStart?.();
    } else {
      onImpressionEnd?.();
    }
  }, [isImpressed, onImpressionStart, onImpressionEnd]);

  return <ImpressionAreaImpl {...props} onImpressionChange={onImpressionChange} />;
}

function ImpressionAreaImpl({
  children,
  onImpressionChange: _onImpressionChange = noop,
  enabled = true,
  areaThreshold = 0,
  style,
}: PropsWithChildren<{
  onImpressionChange?: (isImpressed: boolean) => void;
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
  areaThreshold?: number;
}>) {
  const visible = useVisibility();
  const [inviewImpressed, setInviewImpressed] = useState(false);

  const context = useContext(IOContext);

  if (context?.manager == null) {
    throw new IOProviderMissingError();
  }

  const impressed = visible && inviewImpressed && enabled;
  const onImpressionChange = usePreservedCallback(_onImpressionChange);

  useEffect(() => {
    onImpressionChange?.(impressed);
  }, [impressed, onImpressionChange]);

  return (
    <InView
      onChange={(inView, currentThreshold) => {
        const isVisible = inView && currentThreshold >= areaThreshold;
        setInviewImpressed(isVisible);
      }}
      style={style}
    >
      {children}
    </InView>
  );
}
