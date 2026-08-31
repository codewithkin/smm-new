import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useThemeColor } from "heroui-native";
import React from "react";
import { Text, View } from "react-native";

import { useCart } from "@/contexts/cart-context";

export default function TabLayout() {
  const themeColorForeground = useThemeColor("foreground");
  const themeColorBackground = useThemeColor("background");
  const themeColorAccent = useThemeColor("accent");
  const { itemCount } = useCart();

  const headerRight = React.useCallback(() => {
    if (itemCount === 0) return null;
    return (
      <View className="mr-4 flex-row items-center">
        <Ionicons name="cart" size={16} color={themeColorForeground} />
        <Text className="ml-1 text-foreground font-semibold">{itemCount}</Text>
      </View>
    );
  }, [itemCount, themeColorForeground]);

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: themeColorBackground,
        },
        headerTintColor: themeColorForeground,
        headerTitleStyle: {
          color: themeColorForeground,
          fontWeight: "600",
        },
        tabBarStyle: {
          backgroundColor: themeColorBackground,
        },
        tabBarActiveTintColor: themeColorAccent,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Point of Sale",
          headerTitle: "Smart Switch Mobile",
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
