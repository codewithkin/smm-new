import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter, type Href } from "expo-router";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNavChrome } from "@/contexts/nav-chrome-context";
import { tokens } from "@/lib/theme";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "./nav-items";

const ACCENT_TINT = "#E9F0FC";

/** Phone-only slide-in navigation drawer, opened from the header hamburger. */
export function NavDrawer() {
  const { drawerOpen, closeDrawer, operator } = useNavChrome();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const activeKey =
    pathname === "/" || pathname.startsWith("/(tabs)") && pathname.length <= 8
      ? "index"
      : pathname.replace(/^\//, "").split("/")[0] || "index";

  const navigate = (route: Href) => {
    closeDrawer();
    router.navigate(route);
  };

  return (
    <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={closeDrawer}>
      <Pressable style={styles.scrim} onPress={closeDrawer} />
      <View style={[styles.panel, { paddingTop: insets.top + 30, paddingBottom: insets.bottom + 22 }]}>
        <View style={styles.identity}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>S</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.storeName}>Smart Switch Mobile</Text>
            <Text style={styles.storeSub}>{operator ? operator.shortName : "Harare CBD"} · Till 01</Text>
          </View>
        </View>

        <View style={styles.group}>
          {PRIMARY_NAV.map((item) => (
            <DrawerItem key={item.key} item={item} active={activeKey === item.key} onPress={() => navigate(item.route)} />
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.group}>
          {SECONDARY_NAV.map((item) => (
            <DrawerItem key={item.key} item={item} active={false} onPress={() => navigate(item.route)} />
          ))}
        </View>

        <View style={{ flex: 1 }} />

        <View style={styles.offlineCard}>
          <View style={styles.offlineDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.offlineTitle}>Offline ready</Text>
            <Text style={styles.offlineBody}>All sales saved on this device</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DrawerItem({ item, active, onPress }: { item: NavItem; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.item, active && styles.itemActive]}>
      <Ionicons name={item.icon} size={20} color={active ? tokens.color.brandDark : tokens.color.inkStrong} />
      <Text style={[styles.itemLabel, { color: active ? tokens.color.brandDark : tokens.color.inkStrong, fontFamily: active ? tokens.font.sansBold : tokens.font.sansSemiBold }]}>
        {item.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(31,37,47,0.52)",
  },
  panel: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 312,
    backgroundColor: tokens.color.surface,
    paddingHorizontal: 18,
    shadowColor: "#1B2A44",
    shadowOpacity: 0.22,
    shadowRadius: 40,
    shadowOffset: { width: 14, height: 0 },
    elevation: 16,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: tokens.color.accentBrand,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontFamily: tokens.font.displayBlack,
    fontSize: 16,
    color: tokens.color.brandForeground,
    letterSpacing: -0.3,
  },
  storeName: {
    fontFamily: tokens.font.display,
    fontSize: 16,
    color: tokens.color.ink,
    letterSpacing: -0.3,
  },
  storeSub: {
    fontFamily: tokens.font.sans,
    fontSize: 11,
    color: tokens.color.inkSoft,
  },
  group: {
    gap: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: 13,
  },
  itemActive: {
    backgroundColor: ACCENT_TINT,
  },
  itemLabel: {
    fontSize: 14.5,
  },
  divider: {
    height: 1,
    backgroundColor: tokens.color.border,
    marginVertical: 18,
    marginHorizontal: 8,
  },
  offlineCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: tokens.color.successBg,
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.color.successStrong,
  },
  offlineTitle: {
    fontFamily: tokens.font.sansBold,
    fontSize: 12.5,
    color: tokens.color.success,
  },
  offlineBody: {
    fontFamily: tokens.font.sans,
    fontSize: 11,
    color: tokens.color.success,
    opacity: 0.8,
  },
});
