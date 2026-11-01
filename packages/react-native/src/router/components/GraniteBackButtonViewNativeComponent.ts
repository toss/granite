import { codegenNativeComponent, type ViewProps } from 'react-native';

/**
 * iOS view class `GraniteBackButtonView` from @granite-js/screen. Hosts register it themselves
 * because @granite-js/screen is not autolinked, so render it only after checking that it is registered.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface NativeProps extends ViewProps {}

export default codegenNativeComponent<NativeProps>('GraniteBackButtonView');
