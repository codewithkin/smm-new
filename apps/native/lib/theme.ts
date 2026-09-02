/**
 * Design-system tokens for Smart Switch Mobile POS.
 *
 * These live in CSS too (see `global.css` `@theme`), exposed as uniwind classes
 * (`bg-brand`, `text-ink`, `font-display`, ...). This module mirrors the values
 * as hex/number literals so they can be used programmatically (inline styles,
 * icon `color` props, `AttentionConfig`, chart colors) where a class string
 * isn't available.
 *
 * Colors are the sRGB conversions of the design's `oklch()` values — keep the
 * two files in sync. Each hex is annotated with the source `oklch(...)`.
 */
export const tokens = {
  color: {
    /* -- Brand / accent blue (hue 258) -- */
    /** Full-bleed brand header / hero-panel blue. */
    brand: "#06489C", // oklch(0.42 0.15 258)
    /** Slightly deeper brand blue for gradients/pressed brand surfaces. */
    brandDark: "#11458C", // oklch(0.40 0.13 258)
    /** Foreground on brand surfaces. */
    brandForeground: "#FFFFFF",
    /** Primary/CTA and focus-ring blue. */
    accentBrand: "#1F6DD8", // oklch(0.55 0.18 258)
    /** Pressed/hover accent. */
    accentBrandDark: "#004EB6", // oklch(0.45 0.18 258)
    /** Foreground on accent surfaces. */
    accentForeground: "#FFFFFF",

    /* -- Ink / neutral text (hue 262) -- */
    /** Base text ("ink"). */
    ink: "#232933", // oklch(0.28 0.02 262)
    /** Strong secondary text / sub-headings. */
    inkStrong: "#474D58", // oklch(0.42 0.02 262)
    /** Secondary text. */
    inkSoft: "#646972", // oklch(0.52 0.015 262)
    /** Muted text (labels/values). */
    inkMuted: "#7B8089", // oklch(0.60 0.015 262)
    /** Faint text (hints). */
    inkFaint: "#81868F", // oklch(0.62 0.015 262)
    /** Subtle text / disabled / placeholder. */
    inkSubtle: "#999FA8", // oklch(0.70 0.015 262)

    /* -- Surfaces & borders -- */
    /** Card / panel surface (near-white). */
    panel: "#F8FAFD", // oklch(0.985 0.004 258)
    /** App canvas background. */
    app: "#EDF0F6", // oklch(0.955 0.008 255)
    /** Pure surface (cards on canvas). */
    surface: "#FFFFFF",
    /** Muted fill (chips / inset fields). */
    surfaceMuted: "#F1F3F8", // oklch(0.965 0.006 262)
    /** Sunken fill (track / secondary inset). */
    surfaceSunken: "#EAEDF2", // oklch(0.945 0.008 262)
    /** Hairline border. */
    border: "#E1E4E9", // oklch(0.918 0.007 262)
    /** Slightly cooler hairline. */
    borderMuted: "#E1E5EB", // oklch(0.92 0.01 262)
    /** Stronger divider / control outline. */
    borderStrong: "#D1D4DA", // oklch(0.87 0.008 262)

    /* -- Success / in-stock (green, hue 155) -- */
    success: "#006436", // oklch(0.44 0.11 155)
    successStrong: "#269E5F", // oklch(0.62 0.14 155)
    successBg: "#E1F7E7", // oklch(0.955 0.03 155)
    successBorder: "#EAF8EE", // oklch(0.965 0.02 155)

    /* -- Danger / out-of-stock (red, hue 25) -- */
    danger: "#B63132", // oklch(0.52 0.17 25)
    dangerBg: "#FFE2DE", // oklch(0.94 0.04 25)
    dangerBorder: "#FFECE9", // oklch(0.96 0.025 25)

    /* -- Warning / low-stock (amber, hue 65-75) -- */
    warning: "#8A4C00", // oklch(0.48 0.12 65)
    warningBg: "#FFEACA", // oklch(0.95 0.05 75)
    warningBorder: "#FFF2E1", // oklch(0.97 0.03 65)
  },
  font: {
    /** Bricolage Grotesque Bold — display/headings. */
    display: "BricolageGrotesque-Bold",
    /** Bricolage Grotesque ExtraBold — brand mark / hero. */
    displayBlack: "BricolageGrotesque-ExtraBold",
    /** Plus Jakarta Sans — body text. */
    sans: "PlusJakartaSans-Regular",
    /** Plus Jakarta Sans Medium. */
    sansMedium: "PlusJakartaSans-Medium",
    /** Plus Jakarta Sans SemiBold. */
    sansSemiBold: "PlusJakartaSans-SemiBold",
    /** Plus Jakarta Sans Bold. */
    sansBold: "PlusJakartaSans-Bold",
    /** JetBrains Mono — codes/SKUs/receipt figures. */
    mono: "JetBrainsMono-Regular",
    /** JetBrains Mono Medium. */
    monoMedium: "JetBrainsMono-Medium",
  },
  /** Corner radii used across the design. */
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 22,
    pill: 999,
  },
} as const;

export type DesignTokens = typeof tokens;
