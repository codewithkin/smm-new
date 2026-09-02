import { Tabs } from "expo-router";
import { View } from "react-native";

import { AppTabBar } from "@/components/nav/app-tab-bar";
import { NavDrawer } from "@/components/nav/nav-drawer";
import { NavChromeProvider } from "@/contexts/nav-chrome-context";

export default function TabLayout() {
  return (
    <NavChromeProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{ headerShown: false }}
          tabBar={(props) => <AppTabBar {...props} />}
        >
          <Tabs.Screen name="index" options={{ title: "Point of Sale" }} />
          <Tabs.Screen name="sales" options={{ title: "Sales" }} />
          <Tabs.Screen name="products" options={{ title: "Products" }} />
        </Tabs>
        <NavDrawer />
      </View>
    </NavChromeProvider>
  );
}
