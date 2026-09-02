import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIsTablet, TABLET_RAIL_SPACE } from "@/lib/responsive";
import { tokens } from "@/lib/theme";
import { AppHeader } from "./app-header";

type Props = {
  title: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
};

/**
 * Shared per-screen frame: applies the app background and safe-area insets,
 * clears the tablet nav rail with a left inset, and renders the responsive
 * header above the screen body. Bottom spacing on phone is handled by the
 * in-flow bottom tab bar.
 */
export function ScreenScaffold({ title, subtitle, headerRight, children }: Props) {
  const isTablet = useIsTablet();
  const insets = useSafeAreaInsets();

  if (isTablet) {
    return (
      <View
        style={[
          styles.tabletRoot,
          {
            paddingTop: insets.top + 14,
            paddingBottom: insets.bottom + 14,
            paddingRight: insets.right + 14,
            paddingLeft: insets.left + TABLET_RAIL_SPACE,
          },
        ]}
      >
        <AppHeader title={title} subtitle={subtitle} right={headerRight} />
        <View style={styles.body}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[styles.phoneRoot, { paddingTop: insets.top }]}>
      <AppHeader title={title} subtitle={subtitle} right={headerRight} />
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabletRoot: {
    flex: 1,
    backgroundColor: tokens.color.app,
    gap: 12,
  },
  phoneRoot: {
    flex: 1,
    backgroundColor: tokens.color.app,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
});
