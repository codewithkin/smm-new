/**
 * Design-system tokens for Smart Switch Mobile POS.
 *
 * These live in CSS too (see `global.css` `@theme`), exposed as uniwind classes
 * (`bg-brand`, `text-ink`, `font-display`, ...). This module mirrors the color
 * values as hex so they can be used programmatically (e.g. inline styles,
 * `AttentionConfig`, chart colors) where a class string isn't available.
 *
 * Values are the sRGB conversions of the design's `oklch()` colors.
 */
export const tokens = {
  color: {
    /** Full-bleed brand/header blue. */
    brand: "#06489C",
    /** Primary/CTA and focus-ring blue. */
    accentBrand: "#1F6DD8",
    /** Base text ("ink"). */
    ink: "#232933",
    /** Secondary text. */
    inkSoft: "#646972",
    /** Muted text (labels/hints). */
    inkMuted: "#7B8089",
    /** Faintest text. */
    inkFaint: "#81868F",
    /** Screen/surface panel background. */
    panel: "#F8FAFD",
    /** App canvas background. */
    app: "#EDF0F6",
  },
  font: {
    /** Bricolage Grotesque Bold — display/headings. */
    display: "BricolageGrotesque-Bold",
    /** Bricolage Grotesque ExtraBold — brand mark. */
    displayBlack: "BricolageGrotesque-ExtraBold",
    /** Plus Jakarta Sans — body text. */
    sans: "PlusJakartaSans-Regular",
    /** Plus Jakarta Sans Medium. */
    sansMedium: "PlusJakartaSans-Medium",
    /** Plus Jakarta Sans SemiBold. */
    sansSemiBold: "PlusJakartaSans-SemiBold",
    /** Plus Jakarta Sans Bold. */
    sansBold: "PlusJakartaSans-Bold",
    /** JetBrains Mono — code/labels. */
    mono: "JetBrainsMono-Regular",
    /** JetBrains Mono Medium. */
    monoMedium: "JetBrainsMono-Medium",
  },
} as const;

export type DesignTokens = typeof tokens;