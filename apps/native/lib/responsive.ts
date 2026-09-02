import { useWindowDimensions } from "react-native";

/**
 * Width (dp) at/above which we render the landscape "tablet" layouts (nav rail,
 * split panels) and below which we render the stacked "phone" layouts. Sits
 * between a large phone in landscape and a small tablet.
 */
export const TABLET_MIN_WIDTH = 760;

/** Horizontal space the floating tablet nav rail occupies (rail 70 + gutters). */
export const TABLET_RAIL_SPACE = 98;

/** True when the current window is wide enough for the tablet layout. */
export function useIsTablet(): boolean {
  const { width } = useWindowDimensions();
  return width >= TABLET_MIN_WIDTH;
}

/** Initials (max 2) from a display name, e.g. "Tanaka Moyo" -> "TM". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
