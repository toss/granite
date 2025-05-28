import { SvgXml } from '@granite-js/native/react-native-svg';
import { Platform, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';

interface BackButtonProps extends TouchableOpacityProps {
  tintColor?: string;
  onPress?: () => void;
}

const DEFAULT_COLOR = '#191f28'; // grey900
function BackButton({ tintColor, onPress }: BackButtonProps) {
  return <NavbarBackButton onPress={onPress} color={tintColor ?? DEFAULT_COLOR} />;
}

function NavbarBackButton({ onPress, color }: { onPress?: () => void; color?: string }) {
  return (
    <TouchableOpacity
      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      style={{ width: 24, height: 24 }}
      onPress={onPress}
      accessible={true}
      accessibilityLabel="Go back"
      accessibilityRole="button"
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

const BACK_BUTTON_MARGIN = Platform.select<number>({
  android: -4,
  ios: -12,
  default: -12,
});

export { BackButton };
