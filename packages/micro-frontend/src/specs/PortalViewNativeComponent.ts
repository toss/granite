import { codegenNativeComponent, type ViewProps } from "react-native";

interface NativeProps extends ViewProps {
  readonly hostName: string;
}

export default codegenNativeComponent<NativeProps>("PortalView", {
  interfaceOnly: true,
});
