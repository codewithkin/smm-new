import { useFonts } from "expo-font";

/**
 * Google-font family names registered with `expo-font`.
 * These are the strings to pass as `fontFamily`.
 *
 * Note: `expo-font` maps each asset to a single family, so every weight is its
 * own family. Set the family on <Text> and leave `fontWeight` at the matching
 * number, or rely on these names directly.
 */
export const fontFamilies = {
  display: "BricolageGrotesque-Bold",
  displayBlack: "BricolageGrotesque-ExtraBold",
  sans: "PlusJakartaSans-Regular",
  sansMedium: "PlusJakartaSans-Medium",
  sansSemiBold: "PlusJakartaSans-SemiBold",
  sansBold: "PlusJakartaSans-Bold",
  mono: "JetBrainsMono-Regular",
  monoMedium: "JetBrainsMono-Medium",
} as const;

const fontMap = {
  [fontFamilies.display]: require("@/assets/fonts/BricolageGrotesque-Bold.ttf"),
  [fontFamilies.displayBlack]: require("@/assets/fonts/BricolageGrotesque-ExtraBold.ttf"),
  [fontFamilies.sans]: require("@/assets/fonts/PlusJakartaSans-Regular.ttf"),
  [fontFamilies.sansMedium]: require("@/assets/fonts/PlusJakartaSans-Medium.ttf"),
  [fontFamilies.sansSemiBold]: require("@/assets/fonts/PlusJakartaSans-SemiBold.ttf"),
  [fontFamilies.sansBold]: require("@/assets/fonts/PlusJakartaSans-Bold.ttf"),
  [fontFamilies.mono]: require("@/assets/fonts/JetBrainsMono-Regular.ttf"),
  [fontFamilies.monoMedium]: require("@/assets/fonts/JetBrainsMono-Medium.ttf"),
};

/** Loads the app's fonts. Returns `[fontsLoaded, error]`. */
export function useLoadedFonts(): [boolean, Error | null] {
  const [loaded, error] = useFonts(fontMap);
  return [loaded, error ?? null];
}