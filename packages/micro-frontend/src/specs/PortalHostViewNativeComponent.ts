import { codegenNativeComponent, type ViewProps } from "react-native";

interface NativeProps extends ViewProps {
  readonly name?: string;
}

export default codegenNativeComponent<NativeProps>("PortalHostView", {
  interfaceOnly: true,
});
