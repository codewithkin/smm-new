import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

import { useCart } from "@/contexts/cart-context";
import { useAppTheme } from "@/contexts/app-theme-context";
import { tokens } from "@/lib/theme";

export default function TabLayout() {
  const { isDark } = useAppTheme();
  const { itemCount } = useCart();

  // Design tokens; fall back to light/dark-aware neutrals for the chrome.
  const background = isDark ? "#0F1214" : tokens.color.app;
  const foreground = isDark ? "#F8FAFD" : tokens.color.ink;
  const accent = isDark ? tokens.color.accentBrand : tokens.color.accentBrand;

  const headerRight = React.useCallback(() => {
    if (itemCount === 0) return null;
    return (
      <View className="mr-4 flex-row items-center">
        <Ionicons name="cart" size={16} color={foreground} />
        <Text className="ml-1 font-semibold" style={{ color: foreground }}>
          {itemCount}
        </Text>
      </View>
    );
  }, [itemCount, foreground]);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: background },
        headerTitleStyle: { color: foreground, fontFamily: tokens.font.sansSemiBold },
        tabBarStyle: { backgroundColor: background },
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: isDark ? "#7B8089" : tokens.color.inkMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Point of Sale",
          headerTitle: "Smart Switch Mobile",
          headerTitleStyle: { fontFamily: tokens.font.display },
          headerRight,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: "Sales",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
