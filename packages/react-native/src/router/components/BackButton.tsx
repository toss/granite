import { SvgXml } from '@granite-js/native/react-native-svg';
import { useState } from 'react';
import { Platform, TouchableOpacity, TouchableOpacityProps, UIManager, View } from 'react-native';
import GraniteBackButtonView from './GraniteBackButtonViewNativeComponent';

interface BackButtonProps extends TouchableOpacityProps {
  tintColor?: string;
  onPress?: () => void;
}
/**
 * @public
 * @category UI
 * @name BackButton
 * @description
 * A back button component. This component is primarily used to implement functionality for returning to the previous screen in navigation headers or custom screen tops. If no `onPress` handler is set, it won't perform any action.
 *
 * @param {string} [props.tintColor] - The color of the button icon. You can use CSS color strings.
 * @param {() => void} [props.onPress] - A function to execute when the button is pressed. For example, you can add a function to return to the previous screen.
 *
 * @returns {ReactElement} Returns a back button component.
 * @example
 *
 * ### Example of directly passing a handler to a back button and setting a function to close the view
 *
 * ```tsx
 * import { createNavigationContainerRef, useNavigation } from '@granite-js/native/@react-navigation/native';
 * import { BackButton, useRouterBackHandler } from '@granite-js/react-native';
 * import { useEffect } from 'react';
 *
 * const navigationContainerRef = createNavigationContainerRef();
 *
 * function MyBackButton() {
 *   const navigation = useNavigation();
 *
 *   const { handler } = useRouterBackHandler({
 *     navigationContainerRef,
 *     onClose: () => {
 *       // close the view
 *     },
 *   });
 *
 *   useEffect(() => {
 *     navigation.setOptions({
 *       headerLeft: () => <BackButton onPress={handler} />,
 *     });
 *   }, [handler, navigation]);
 *
 *   return <></>;
 * }
 */
function BackButton({ tintColor, onPress }: BackButtonProps) {
  return <NavbarBackButton onPress={onPress} color={tintColor} />;
}

function NavbarBackButton({ onPress, color }: { onPress?: () => void; color?: string }) {
  const [hasBackButtonView] = useState(hasGraniteBackButtonView);
  const button = (
    <TouchableOpacity
      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      style={{ width: 24, height: 24 }}
      onPress={onPress}
      accessible={true}
      accessibilityLabel="Go back"
      accessibilityRole="button"
      {...BACK_BUTTON_NATIVE_PROPS}
    >
      <View style={{ width: 24, height: 24 }}>
        <SvgXml
          width={24}
          height={24}
          xml={BACK_BUTTON_XML.replace(/fill="#[0-9a-fA-F]{6}"/g, `fill="${color}"`)}
          style={{
            marginLeft: BACK_BUTTON_MARGIN,
          }}
        />
      </View>
    </TouchableOpacity>
  );

  return hasBackButtonView ? <GraniteBackButtonView>{button}</GraniteBackButtonView> : button;
}

const ANDROID_BACK_BUTTON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="line-icon">
<path fill="#B0B8C1" fill-rule="evenodd" d="M20.966 10.8H6.93l5.451-5.451a1.2 1.2 0 10-1.697-1.697l-7.5 7.5c-.003.002-.004.006-.007.009a1.2 1.2 0 00-.252 1.298c.06.143.145.27.252.38l.007.01 7.5 7.5c.235.234.542.35.848.35a1.2 1.2 0 00.849-2.048L6.931 13.2h14.036a1.2 1.2 0 100-2.4"/>
</svg>`;

const IOS_BACK_BUTTON = `<svg enable-background="new 0 0 24 24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
<path d="m20.8 20.7c-.3 0-.6-.1-.8-.4l-7.5-7.5c-.5-.5-.5-1.2 0-1.7l7.5-7.5c.5-.5 1.2-.5 1.7 0s.5 1.2 0 1.7l-6.8 6.7 6.7 6.7c.5.5.5 1.2 0 1.7-.2.2-.5.3-.8.3z" fill="#b0b8c1"/>
</svg>`;

const BACK_BUTTON_XML = Platform.select<string>({
  android: ANDROID_BACK_BUTTON,
  ios: IOS_BACK_BUTTON,
  default: IOS_BACK_BUTTON,
});

/**
 * Apps built with the iOS 27 SDK, like the Toss app, always draw navigation bars with Liquid Glass on iOS 27 and later.
 * Liquid Glass places a header item further right than the earlier design.
 */
const IS_LIQUID_GLASS_NAVIGATION_BAR = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 27;

/**
 * On iOS, puts the arrow tip where the Toss app's native back button draws it.
 */
const BACK_BUTTON_MARGIN = Platform.select<number>({
  android: 0,
  ios: IS_LIQUID_GLASS_NAVIGATION_BAR ? -18.33 : -4.33,
  default: -4.33,
});

/**
 * Lets an iOS host find this button among header views, for example to draw a native back button in its place.
 * Hosts depend on this nativeID, so keep it stable.
 */
const BACK_BUTTON_NATIVE_PROPS = Platform.select<{ nativeID?: string }>({
  ios: { nativeID: 'granite.header.backButton' },
  default: {},
});

/**
 * On iOS, the button is wrapped in `GraniteBackButtonView` so a host can find it by its view class.
 * Hosts register that view through @granite-js/screen. Without it, for example in an app version
 * from before the view, the button renders as is.
 */
function hasGraniteBackButtonView() {
  return Platform.OS === 'ios' && UIManager.hasViewManagerConfig('GraniteBackButtonView');
}

export { BackButton };
