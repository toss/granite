import { useState } from "react";
import {
  createNavigationContainerRef,
  NavigationContainer,
  NavigationIndependentTree,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";

import { walletStyles } from "./WalletService.styles";

type WalletStackParamList = {
  Home: undefined;
  Transfer: undefined;
};

export const WALLET_HOST_NAME = "cross-activity-secondary" as const;
export const WALLET_NAVIGATION_REF =
  createNavigationContainerRef<WalletStackParamList>();

const WalletStack = createNativeStackNavigator<WalletStackParamList>();

export function WalletService() {
  const [transferCount, setTransferCount] = useState(0);

  return (
    <NavigationIndependentTree>
      <NavigationContainer ref={WALLET_NAVIGATION_REF}>
        <WalletStack.Navigator
          initialRouteName="Home"
          screenOptions={{
            contentStyle: walletStyles.screen,
            headerStyle: walletStyles.header,
            headerTintColor: "#F4F8FC",
            headerTitleStyle: walletStyles.headerTitle,
          }}
        >
          <WalletStack.Screen name="Home" options={{ title: "Harbor Wallet" }}>
            {({ navigation }) => (
              <View style={walletStyles.home} testID="wallet_service_home">
                <View style={walletStyles.topRow}>
                  <View>
                    <Text style={walletStyles.serviceLabel}>
                      SECONDARY SERVICE
                    </Text>
                    <Text style={walletStyles.welcome}>Good afternoon</Text>
                  </View>
                  <View style={walletStyles.status}>
                    <Text style={walletStyles.statusText}>ACTIVE</Text>
                  </View>
                </View>

                <View style={walletStyles.balancePanel}>
                  <Text style={walletStyles.balanceLabel}>
                    AVAILABLE BALANCE
                  </Text>
                  <Text style={walletStyles.balance}>$2,481.73</Text>
                  <Text style={walletStyles.account}>
                    Harbor account · 1842
                  </Text>
                </View>

                <View style={walletStyles.activityRow}>
                  <Text style={walletStyles.activityTitle}>
                    Transfer activity
                  </Text>
                  <Text
                    style={walletStyles.transferCount}
                    testID="wallet_transfer_count"
                  >
                    {transferCount} sent
                  </Text>
                </View>
                <View style={walletStyles.transaction}>
                  <View style={walletStyles.transactionMark} />
                  <View style={walletStyles.transactionCopy}>
                    <Text style={walletStyles.transactionName}>Coffee bar</Text>
                    <Text style={walletStyles.transactionMeta}>
                      Today · Card payment
                    </Text>
                  </View>
                  <Text style={walletStyles.transactionAmount}>-$18.40</Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setTransferCount((value) => value + 1)}
                  style={({ pressed }) => [
                    walletStyles.primaryAction,
                    pressed ? walletStyles.primaryActionPressed : null,
                  ]}
                  testID="wallet_create_transfer"
                >
                  <Text style={walletStyles.primaryActionText}>
                    Create transfer
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate("Transfer")}
                  style={({ pressed }) => [
                    walletStyles.secondaryAction,
                    pressed ? walletStyles.secondaryActionPressed : null,
                  ]}
                  testID="wallet_open_transfer"
                >
                  <Text style={walletStyles.secondaryActionText}>
                    Review latest transfer
                  </Text>
                </Pressable>
              </View>
            )}
          </WalletStack.Screen>
          <WalletStack.Screen
            name="Transfer"
            options={{ title: "Transfer activity" }}
          >
            {() => (
              <View style={walletStyles.transferPage} testID="wallet_transfer">
                <Text style={walletStyles.serviceLabel}>SETTLED TODAY</Text>
                <Text style={walletStyles.transferTitle}>Coffee bar</Text>
                <Text style={walletStyles.transferAmount}>-$18.40</Text>

                <View style={walletStyles.transferPanel}>
                  <View style={walletStyles.detailRow}>
                    <Text style={walletStyles.detailLabel}>Status</Text>
                    <Text style={walletStyles.detailValue}>Completed</Text>
                  </View>
                  <View style={walletStyles.divider} />
                  <View style={walletStyles.detailRow}>
                    <Text style={walletStyles.detailLabel}>Account</Text>
                    <Text style={walletStyles.detailValue}>Harbor · 1842</Text>
                  </View>
                  <View style={walletStyles.divider} />
                  <View style={walletStyles.detailRow}>
                    <Text style={walletStyles.detailLabel}>Session total</Text>
                    <Text style={walletStyles.detailValue}>
                      {transferCount} transfer{transferCount === 1 ? "" : "s"}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </WalletStack.Screen>
        </WalletStack.Navigator>
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}
