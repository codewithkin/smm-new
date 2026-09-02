import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIsTablet } from "@/lib/responsive";
import { tokens } from "@/lib/theme";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "./nav-items";

/** Light-blue tint behind an active nav item (oklch(0.96 0.025 258)). */
const ACCENT_TINT = "#E9F0FC";

/**
 * Responsive tab bar for the (tabs) navigator:
 * - Tablet: a floating left rail (absolutely positioned → no layout footprint,
 *   screens clear it with a left inset).
 * - Phone: a standard bottom tab bar.
 */
export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const isTablet = useIsTablet();
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;

  const go = (item: NavItem, routeName: string) => {
    const event = navigation.emit({
      type: "tabPress",
      target: state.routes.find((r: { name: string; key: string }) => r.name === routeName)?.key ?? "",
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) navigation.navigate(routeName as never);
  };

  if (isTablet) {
    return (
      <View
        pointerEvents="box-none"
        style={[styles.railWrap, { top: insets.top + 14, bottom: insets.bottom + 14, left: insets.left + 14 }]}
      >
        <View style={styles.rail}>
          <View style={styles.railLogo}>
            <Text style={styles.railLogoText}>S</Text>
          </View>
          <View style={styles.railDivider} />

          {PRIMARY_NAV.map((item) => (
            <RailItem key={item.key} item={item} active={activeName === item.key} onPress={() => go(item, item.key)} />
          ))}

          <View style={{ flex: 1 }} />

          {SECONDARY_NAV.filter((i) => i.key === "settings").map((item) => (
            <RailItem key={item.key} item={item} active={false} onPress={() => go(item, "index")} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
      {PRIMARY_NAV.map((item) => {
        const active = activeName === item.key;
        return (
          <Pressable key={item.key} onPress={() => go(item, item.key)} style={[styles.bottomItem, active && styles.itemActive]}>
            <Ionicons
              name={item.icon}
              size={20}
              color={active ? tokens.color.brandDark : tokens.color.inkSoft}
            />
            <Text style={[styles.bottomLabel, { color: active ? tokens.color.brandDark : tokens.color.inkSoft }]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function RailItem({ item, active, onPress }: { item: NavItem; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.railItem, active && styles.itemActive]}>
      <Ionicons name={item.icon} size={22} color={active ? tokens.color.brandDark : tokens.color.inkSoft} />
      <Text style={[styles.railLabel, { color: active ? tokens.color.brandDark : tokens.color.inkSoft }]}>
        {item.label}
      </Text>
    </Pressable>
  );
}

const CARD_SHADOW = {
  shadowColor: "#1B2A44",
  shadowOpacity: 0.06,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

const styles = StyleSheet.create({
  /* Tablet rail */
  railWrap: {
    position: "absolute",
    width: 70,
  },
  rail: {
    flex: 1,
    width: 70,
    backgroundColor: tokens.color.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tokens.color.border,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 7,
    gap: 4,
    ...CARD_SHADOW,
  },
  railLogo: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: tokens.color.accentBrand,
    alignItems: "center",
    justifyContent: "center",
  },
  railLogoText: {
    fontFamily: tokens.font.displayBlack,
    fontSize: 17,
    color: tokens.color.brandForeground,
    letterSpacing: -0.5,
  },
  railDivider: {
    width: 34,
    height: 1,
    backgroundColor: tokens.color.border,
    marginTop: 12,
    marginBottom: 8,
  },
  railItem: {
    width: 56,
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderRadius: 14,
    alignItems: "center",
    gap: 5,
  },
  railLabel: {
    fontFamily: tokens.font.sansSemiBold,
    fontSize: 10.5,
    textAlign: "center",
  },

  /* Phone bottom bar */
  bottomBar: {
    flexDirection: "row",
    gap: 6,
    paddingTop: 8,
    paddingHorizontal: 12,
    backgroundColor: tokens.color.surface,
    borderTopWidth: 1,
    borderTopColor: tokens.color.borderMuted,
  },
  bottomItem: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 13,
    alignItems: "center",
    gap: 5,
  },
  bottomLabel: {
    fontFamily: tokens.font.sansSemiBold,
    fontSize: 11.5,
  },

  itemActive: {
    backgroundColor: ACCENT_TINT,
  },
});
