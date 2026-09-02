import type { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";

export type IoniconName = keyof typeof Ionicons.glyphMap;

export type NavItem = {
  /** Matches the route name under (tabs) for active detection. */
  key: string;
  label: string;
  icon: IoniconName;
  route: Href;
};

/** Primary destinations — shown in the tablet rail and the phone bottom tabs. */
export const PRIMARY_NAV: NavItem[] = [
  { key: "index", label: "Sell", icon: "storefront-outline", route: "/(tabs)" },
  { key: "sales", label: "Sales", icon: "receipt-outline", route: "/(tabs)/sales" },
  { key: "products", label: "Products", icon: "grid-outline", route: "/(tabs)/products" },
];

/**
 * Secondary destinations — shown in the phone drawer and pinned to the bottom
 * of the tablet rail. Settings lives here; Stock is reached from the Products
 * screen's "Stock" entry, so it is not duplicated as a top-level destination.
 */
export const SECONDARY_NAV: NavItem[] = [
  { key: "settings", label: "Settings", icon: "settings-outline", route: "/settings" },
];
