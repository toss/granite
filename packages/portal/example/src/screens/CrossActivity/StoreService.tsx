import { useState } from "react";
import {
  createNavigationContainerRef,
  NavigationContainer,
  NavigationIndependentTree,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";

import { storeStyles } from "./StoreService.styles";

type StoreStackParamList = {
  Home: undefined;
  Product: undefined;
};

export const STORE_HOST_NAME = "cross-activity-primary" as const;
export const STORE_NAVIGATION_REF =
  createNavigationContainerRef<StoreStackParamList>();

const StoreStack = createNativeStackNavigator<StoreStackParamList>();

export function StoreService() {
  const [bagItems, setBagItems] = useState(0);

  return (
    <NavigationIndependentTree>
      <NavigationContainer ref={STORE_NAVIGATION_REF}>
        <StoreStack.Navigator
          initialRouteName="Home"
          screenOptions={{
            contentStyle: storeStyles.screen,
            headerStyle: storeStyles.header,
            headerTintColor: "#FFFDF8",
            headerTitleStyle: storeStyles.headerTitle,
          }}
        >
          <StoreStack.Screen name="Home" options={{ title: "Northstar Store" }}>
            {({ navigation }) => (
              <ScrollView
                contentContainerStyle={storeStyles.home}
                testID="store_service_home"
              >
                <Text style={storeStyles.eyebrow}>PRIMARY SERVICE</Text>
                <Text style={storeStyles.display}>Made for slower days.</Text>
                <Text style={storeStyles.intro}>
                  A small catalog owned only by the primary Activity.
                </Text>

                <View style={storeStyles.productPanel}>
                  <Text style={storeStyles.productLabel}>FEATURED OBJECT</Text>
                  <Text style={storeStyles.productName}>Field Notes Set</Text>
                  <Text style={storeStyles.productDescription}>
                    Three linen notebooks, brass clip, and a pencil that stays
                    sharp.
                  </Text>
                  <View style={storeStyles.productFooter}>
                    <Text style={storeStyles.price}>$38</Text>
                    <Text style={storeStyles.stock}>12 in stock</Text>
                  </View>
                </View>

                <Text style={storeStyles.bagCount} testID="store_bag_count">
                  Bag items: {bagItems}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setBagItems((value) => value + 1)}
                  style={({ pressed }) => [
                    storeStyles.primaryAction,
                    pressed ? storeStyles.primaryActionPressed : null,
                  ]}
                  testID="store_add_to_bag"
                >
                  <Text style={storeStyles.primaryActionText}>Add to bag</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate("Product")}
                  style={({ pressed }) => [
                    storeStyles.secondaryAction,
                    pressed ? storeStyles.secondaryActionPressed : null,
                  ]}
                  testID="store_open_product"
                >
                  <Text style={storeStyles.secondaryActionText}>
                    View product notes
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    Linking.openURL("teleport-example://cross-activity/main")
                  }
                  style={({ pressed }) => [
                    storeStyles.secondaryAction,
                    pressed ? storeStyles.secondaryActionPressed : null,
                  ]}
                  testID="store_open_main_activity"
                >
                  <Text style={storeStyles.secondaryActionText}>
                    Open native launcher Activity
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    Linking.openURL(
                      "teleport-portal://cross-activity-secondary",
                    )
                  }
                  style={({ pressed }) => [
                    storeStyles.walletAction,
                    pressed ? storeStyles.walletActionPressed : null,
                  ]}
                  testID="store_open_wallet"
                >
                  <Text style={storeStyles.walletActionText}>
                    Open Harbor Wallet Activity
                  </Text>
                </Pressable>
              </ScrollView>
            )}
          </StoreStack.Screen>
          <StoreStack.Screen
            name="Product"
            options={{ title: "Field Notes Set" }}
          >
            {() => (
              <View style={storeStyles.productPage} testID="store_product">
                <Text style={storeStyles.eyebrow}>NORTHSTAR OBJECT 014</Text>
                <Text style={storeStyles.productPageTitle}>
                  Notes that belong on a desk.
                </Text>
                <Text style={storeStyles.intro}>
                  The paper is warm white, the covers are woven linen, and each
                  notebook opens completely flat.
                </Text>
                <View style={storeStyles.specPanel}>
                  <Text style={storeStyles.specLabel}>Contents</Text>
                  <Text style={storeStyles.specValue}>
                    3 notebooks · 1 brass clip · 1 cedar pencil
                  </Text>
                  <View style={storeStyles.divider} />
                  <Text style={storeStyles.specLabel}>Bag</Text>
                  <Text style={storeStyles.specValue}>
                    {bagItems} item{bagItems === 1 ? "" : "s"}
                  </Text>
                </View>
              </View>
            )}
          </StoreStack.Screen>
        </StoreStack.Navigator>
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}
