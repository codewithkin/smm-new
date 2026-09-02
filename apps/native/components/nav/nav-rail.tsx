import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter, type Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIsTablet } from "@/lib/responsive";
import { tokens } from "@/lib/theme";
import { PressableScale } from "@/components/pos/pressable-scale";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "./nav-items";

const ACCENT_TINT = "#E9F0FC";

/**
 * Tablet-only floating left nav rail, rendered as a layout-level overlay so its
 * absolute position is relative to the full screen (not the collapsed bottom
 * tab-bar slot). Screens clear it with a left inset (TABLET_RAIL_SPACE).
 */
export function NavRail() {
  const isTablet = useIsTablet();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  if (!isTablet) return null;

  const activeKey = pathname === "/" ? "index" : pathname.replace(/^\//, "").split("/")[0] || "index";
  const settings = SECONDARY_NAV.find((i) => i.key === "settings");

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + 14, bottom: insets.bottom + 14, left: insets.left + 14 }]}
    >
      <View style={styles.rail}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>S</Text>
        </View>
        <View style={styles.divider} />

        {PRIMARY_NAV.map((item) => (
          <RailItem key={item.key} item={item} active={activeKey === item.key} onPress={() => router.navigate(item.route)} />
        ))}

        <View style={{ flex: 1 }} />

        {settings && (
          <RailItem item={settings} active={activeKey === "settings"} onPress={() => router.push(settings.route as Href)} />
        )}
      </View>
    </View>
  );
}

function RailItem({ item, active, onPress }: { item: NavItem; active: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={[styles.item, active && styles.itemActive]}>
      <Ionicons name={item.icon} size={22} color={active ? tokens.color.brandDark : tokens.color.inkSoft} />
      <Text style={[styles.label, { color: active ? tokens.color.brandDark : tokens.color.inkSoft }]}>{item.label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", width: 70 },
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
    shadowColor: "#1B2A44",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: tokens.color.accentBrand,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontFamily: tokens.font.displayBlack, fontSize: 17, color: tokens.color.brandForeground, letterSpacing: -0.5 },
  divider: { width: 34, height: 1, backgroundColor: tokens.color.border, marginTop: 12, marginBottom: 8 },
  item: { width: 56, paddingVertical: 11, paddingHorizontal: 4, borderRadius: 14, alignItems: "center", gap: 5 },
  itemActive: { backgroundColor: ACCENT_TINT },
  label: { fontFamily: tokens.font.sansSemiBold, fontSize: 10.5, textAlign: "center" },
});
