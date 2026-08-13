import {
  createMicroFrontendRuntime,
  Portal,
  useMicroFrontendSessions,
} from "@granite-js/micro-frontend";
import { useEffect } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
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

// Both services ship inside this example's own bundle, so no app bundle is ever fetched. The
// adapter exists because the runtime requires one; reaching it means something asked to preload.
const runtime = createMicroFrontendRuntime({
  adapter: {
    loadBundle: ({ appName }) =>
      Promise.reject(
        new Error(
          `The portal example does not load remote bundles (requested "${appName}")`,
        ),
      ),
  },
});

export default function CrossActivityController() {
  const sessions = useMicroFrontendSessions(runtime);
  const activeHostName =
    sessions.find(({ isVisible }) => isVisible)?.sessionId ?? null;

  useEffect(() => {
    const backSubscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        const navigationRef =
          activeHostName === STORE_HOST_NAME
            ? STORE_NAVIGATION_REF
            : activeHostName === WALLET_HOST_NAME
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
      backSubscription.remove();
    };
  }, [activeHostName]);

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
