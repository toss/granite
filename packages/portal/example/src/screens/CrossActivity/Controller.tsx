import { Portal } from "@granite-js/portal";
import { useEffect, useRef } from "react";
import {
  BackHandler,
  DeviceEventEmitter,
  StyleSheet,
  View,
} from "react-native";
import {
  STORE_HOST_NAME,
  STORE_NAVIGATION_REF,
  StoreService,
} from "./StoreService";
import {
  WALLET_HOST_NAME,
  WALLET_NAVIGATION_REF,
  WalletService,
} from "./WalletService";

const ACTIVITY_FOCUS_EVENT = "teleportActivityFocusChanged";

export default function CrossActivityController() {
  const activeHostNameRef = useRef<string | null>(null);

  useEffect(() => {
    const focusSubscription = DeviceEventEmitter.addListener(
      ACTIVITY_FOCUS_EVENT,
      (hostName: unknown) => {
        activeHostNameRef.current =
          hostName === STORE_HOST_NAME || hostName === WALLET_HOST_NAME
            ? hostName
            : null;
      },
    );
    const backSubscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        const navigationRef =
          activeHostNameRef.current === STORE_HOST_NAME
            ? STORE_NAVIGATION_REF
            : activeHostNameRef.current === WALLET_HOST_NAME
              ? WALLET_NAVIGATION_REF
              : null;

        if (navigationRef === null || !navigationRef.isReady()) {
          return false;
        }

        if (navigationRef.canGoBack()) {
          navigationRef.goBack();
        } else {
          BackHandler.exitApp();
        }
        return true;
      },
    );

    return () => {
      focusSubscription.remove();
      backSubscription.remove();
    };
  }, []);

  return (
    <View style={styles.controllerRoot}>
      <Portal hostName={STORE_HOST_NAME}>
        <StoreService />
      </Portal>
      <Portal hostName={WALLET_HOST_NAME}>
        <WalletService />
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  controllerRoot: {
    flex: 1,
  },
});
