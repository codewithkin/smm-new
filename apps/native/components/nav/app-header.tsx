import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useNavChrome } from "@/contexts/nav-chrome-context";
import { initials, useIsTablet } from "@/lib/responsive";
import { tokens } from "@/lib/theme";

type Props = {
  title: string;
  /** Overrides the default per-breakpoint subtitle. */
  subtitle?: string;
  /** Optional trailing control (e.g. the POS cart button, a Products "add"). */
  right?: ReactNode;
};

/** Live wall clock, refreshed each half-minute. */
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function AppHeader({ title, subtitle, right }: Props) {
  const isTablet = useIsTablet();
  const { openDrawer, operator } = useNavChrome();
  const now = useClock();

  const time = useMemo(
    () => now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    [now],
  );
  const date = useMemo(
    () => now.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }),
    [now],
  );

  if (isTablet) {
    return (
      <View style={styles.tabletBar}>
        <View style={styles.brandMarkTablet}>
          <Text style={styles.brandMarkText}>S</Text>
        </View>
        <View>
          <Text style={styles.titleTablet}>{title}</Text>
          <Text style={styles.subTablet}>{subtitle ?? "Smart Switch Mobile · Till 01"}</Text>
        </View>

        <View style={{ flex: 1 }} />

        {right}

        <View style={styles.offlineChip}>
          <View style={styles.offlineDot} />
          <Text style={styles.offlineText}>Offline ready</Text>
        </View>
        <View style={styles.vDivider} />
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.clockTime}>{time}</Text>
          <Text style={styles.clockDate}>{date}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{operator ? initials(operator.name) : "··"}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.phoneBar}>
      <Pressable onPress={openDrawer} hitSlop={10} style={styles.hamburger}>
        <Ionicons name="menu" size={26} color={tokens.color.inkStrong} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.titlePhone}>{title}</Text>
        <Text style={styles.subPhone}>{subtitle ?? "Till 01 · Offline ready"}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  /* Tablet top-bar card */
  tabletBar: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 18,
    backgroundColor: tokens.color.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  brandMarkTablet: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: tokens.color.accentBrand,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: {
    fontFamily: tokens.font.displayBlack,
    fontSize: 15,
    color: tokens.color.brandForeground,
    letterSpacing: -0.3,
  },
  titleTablet: {
    fontFamily: tokens.font.display,
    fontSize: 22,
    color: tokens.color.ink,
    letterSpacing: -0.6,
  },
  subTablet: {
    fontFamily: tokens.font.sans,
    fontSize: 11,
    color: tokens.color.inkSoft,
  },
  offlineChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: 9,
    backgroundColor: tokens.color.successBg,
  },
  offlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: tokens.color.successStrong,
  },
  offlineText: {
    fontFamily: tokens.font.sansSemiBold,
    fontSize: 12,
    color: tokens.color.success,
  },
  vDivider: {
    width: 1,
    height: 26,
    backgroundColor: tokens.color.borderMuted,
  },
  clockTime: {
    fontFamily: tokens.font.sansSemiBold,
    fontSize: 13,
    color: tokens.color.ink,
  },
  clockDate: {
    fontFamily: tokens.font.sans,
    fontSize: 11,
    color: tokens.color.inkSoft,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#DCE8FB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: tokens.font.sansBold,
    fontSize: 12,
    color: "#3A6BC4",
  },

  /* Phone header */
  phoneBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  hamburger: {
    paddingVertical: 6,
    paddingRight: 2,
  },
  titlePhone: {
    fontFamily: tokens.font.display,
    fontSize: 20,
    color: tokens.color.ink,
    letterSpacing: -0.5,
  },
  subPhone: {
    fontFamily: tokens.font.sans,
    fontSize: 11,
    color: tokens.color.inkSoft,
  },
});
