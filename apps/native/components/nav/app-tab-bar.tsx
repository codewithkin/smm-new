import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIsTablet } from "@/lib/responsive";
import { tokens } from "@/lib/theme";
import { PRIMARY_NAV } from "./nav-items";

const ACCENT_TINT = "#E9F0FC";

/**
 * Phone bottom tab bar. On tablet it renders nothing — navigation there is the
 * floating left rail (see NavRail), rendered as a layout-level overlay.
 */
export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const isTablet = useIsTablet();
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;

  if (isTablet) return null;

  const go = (routeName: string) => {
    const event = navigation.emit({
      type: "tabPress",
      target: state.routes.find((r: { name: string; key: string }) => r.name === routeName)?.key ?? "",
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) navigation.navigate(routeName as never);
  };

  return (
    <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
      {PRIMARY_NAV.map((item) => {
        const active = activeName === item.key;
        return (
          <Pressable key={item.key} onPress={() => go(item.key)} style={[styles.bottomItem, active && styles.itemActive]}>
            <Ionicons name={item.icon} size={20} color={active ? tokens.color.brandDark : tokens.color.inkSoft} />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[styles.bottomLabel, { color: active ? tokens.color.brandDark : tokens.color.inkSoft }]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: "row",
    gap: 6,
    paddingTop: 8,
    paddingHorizontal: 12,
    backgroundColor: tokens.color.surface,
    borderTopWidth: 1,
    borderTopColor: tokens.color.borderMuted,
  },
  bottomItem: { flex: 1, paddingVertical: 9, borderRadius: 13, alignItems: "center", gap: 5 },
  bottomLabel: { fontFamily: tokens.font.sansSemiBold, fontSize: 11.5 },
  itemActive: { backgroundColor: ACCENT_TINT },
});
