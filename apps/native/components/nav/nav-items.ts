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
 * of the tablet rail. Stock and Settings are not yet built; they are rendered
 * for parity with the design and currently just close the drawer.
 */
export const SECONDARY_NAV: NavItem[] = [
  { key: "stock", label: "Stock", icon: "cube-outline", route: "/(tabs)/products" },
  { key: "settings", label: "Settings", icon: "settings-outline", route: "/settings" },
];
