import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDatabase } from "@/contexts/database-context";
import { settingsQueries } from "@/lib/db/database";
import { tokens } from "@/lib/theme";
import type { TillOperator } from "@/lib/types";

type Props = {
  initial?: TillOperator | null;
};

/** Below this width we render the stacked phone layout; at/above it, the
 *  landscape split-panel tablet layout. 760 sits between a large phone in
 *  landscape and a small tablet. */
const TABLET_MIN_WIDTH = 760;

const FEATURES = [
  "Ring up a sale in three taps",
  "Cash, EcoCash and OneMoney",
  "Stock counts itself down as you sell",
];

export default function FirstRun({ initial = null }: Props) {
  const router = useRouter();
  const { db, isReady } = useDatabase();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isTablet = width >= TABLET_MIN_WIDTH;

  const [name, setName] = useState(initial?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A returning user (operator already set) skips setup and goes straight to POS.
  useEffect(() => {
    if (!isReady || !db) return;
    settingsQueries.getOperator(db).then((op) => {
      if (op) router.replace("/(tabs)");
    });
  }, [isReady, db, router]);

  const canSubmit = name.trim().length > 0 && !saving;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      if (!db) throw new Error("Database not ready yet");
      await settingsQueries.setOperator(db, name);
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSaving(false);
    }
  }, [canSubmit, db, name, router]);

  // Derive the short display form for the hint using the same logic as storage.
  const peekShort = useMemo(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "";
    const [first, ...rest] = parts;
    return rest.length === 0 ? first : `${first} ${rest.map((p) => `${p[0]}.`).join(" ")}`;
  }, [name]);

  const hint = name.trim() ? `Shown as “${peekShort}” on receipts` : "";

  const nameField = (
    <NameField
      value={name}
      onChangeText={(v) => {
        setName(v);
        setError(null);
      }}
      onSubmit={submit}
      editable={isReady}
      hint={hint}
      error={error}
      compact={!isTablet}
    />
  );

  const cta = (
    <Pressable
      onPress={submit}
      disabled={!canSubmit}
      style={[
        styles.cta,
        { height: isTablet ? 60 : 56, marginTop: isTablet ? 30 : 22 },
        !canSubmit && styles.ctaDisabled,
      ]}
    >
      <Text style={[styles.ctaLabel, { fontSize: isTablet ? 17 : 16.5 }]}>Start selling</Text>
      <Ionicons name="arrow-forward" size={isTablet ? 17 : 16} color={tokens.color.accentForeground} />
    </Pressable>
  );

  /* --------------------------------- Tablet -------------------------------- */
  if (isTablet) {
    return (
      <View style={[styles.tabletRoot, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <BrandPanel top={insets.top} bottom={insets.bottom} left={insets.left} />

        <View style={[styles.tabletFormWrap, { paddingBottom: insets.bottom, paddingRight: insets.right }]}>
          <View style={styles.tabletFormInner}>
            <Text style={styles.eyebrow}>Step 1 of 1</Text>
            <Text style={styles.headingTablet}>{"Who is behind\nthe counter?"}</Text>
            <Text style={styles.descTablet}>
              Your name shows on receipts and on every sale in the history, so the owner can
              see who rang it up.
            </Text>

            <View style={{ marginTop: 34 }}>{nameField}</View>
            {cta}

            <Text style={styles.settingsNote}>You can change this any time in Settings</Text>
          </View>
        </View>
      </View>
    );
  }

  /* --------------------------------- Phone --------------------------------- */
  return (
    <View style={styles.phoneRoot}>
      <StatusBar style="light" />
      <KeyboardAwareScrollView
        style={styles.phoneScroll}
        contentContainerStyle={styles.phoneContent}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.phoneHeader,
            { paddingTop: insets.top + 26, paddingLeft: insets.left + 24, paddingRight: insets.right + 24 },
          ]}
        >
          <View style={styles.brandRow}>
            <BrandMark size={40} />
            <View>
              <Text style={styles.brandName}>Smart Switch Mobile</Text>
              <Text style={styles.brandSub}>Point of sale · offline</Text>
            </View>
          </View>

          <Text style={styles.headingPhone}>{"Who is behind\nthe counter?"}</Text>
          <Text style={styles.descPhone}>
            Your name appears on receipts and on every sale in the history.
          </Text>
        </View>

        <View
          style={[
            styles.phoneForm,
            { paddingLeft: insets.left + 24, paddingRight: insets.right + 24 },
          ]}
        >
          {nameField}
          {cta}
          <Text style={styles.settingsNote}>You can change this any time in Settings</Text>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

/* ------------------------------- Shared field ------------------------------ */

function NameField({
  value,
  onChangeText,
  onSubmit,
  editable,
  hint,
  error,
  compact,
}: {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: () => void;
  editable: boolean;
  hint: string;
  error: string | null;
  compact: boolean;
}) {
  return (
    <View style={{ width: "100%" }}>
      <Text style={styles.fieldLabel}>Your name</Text>
      <View
        style={[
          styles.inputWrap,
          { height: compact ? 60 : 64, paddingHorizontal: compact ? 18 : 20 },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          placeholder="e.g. Tanaka Moyo"
          placeholderTextColor={tokens.color.inkSubtle}
          autoCorrect={false}
          autoCapitalize="words"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          style={[styles.input, { fontSize: compact ? 18 : 19 }]}
        />
      </View>
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

/* -------------------------------- Brand bits ------------------------------- */

function BrandMark({ size }: { size: number }) {
  return (
    <View
      style={[
        styles.brandMark,
        { width: size, height: size, borderRadius: size === 44 ? 14 : 13 },
      ]}
    >
      <Text style={[styles.brandMarkText, { fontSize: size === 44 ? 20 : 18 }]}>S</Text>
    </View>
  );
}

function BrandPanel({ top, bottom, left }: { top: number; bottom: number; left: number }) {
  return (
    <View
      style={[
        styles.brandPanel,
        { paddingTop: top + 56, paddingBottom: bottom + 56, paddingLeft: left + 52 },
      ]}
    >
      <View style={styles.brandRow}>
        <BrandMark size={44} />
        <View>
          <Text style={styles.brandName}>Smart Switch Mobile</Text>
          <Text style={styles.brandSub}>Point of sale · Harare</Text>
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <Text style={styles.brandHeadline}>{"Everything\non this till,\noffline."}</Text>
      <Text style={styles.brandBody}>
        Sales, stock and receipts are stored on this device. No account, no data bundle, no
        waiting for a network.
      </Text>

      <View style={{ marginTop: 40, gap: 14 }}>
        {FEATURES.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={13} color={tokens.color.brandForeground} />
            </View>
            <Text style={styles.brandFeature}>{feature}</Text>
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }} />
      <Text style={styles.brandFooter}>Version 1.0 · Till 01</Text>
    </View>
  );
}

const WHITE = tokens.color.brandForeground;

const styles = StyleSheet.create({
  /* Tablet */
  tabletRoot: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: tokens.color.panel,
  },
  tabletFormWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 56,
  },
  tabletFormInner: {
    width: "100%",
    maxWidth: 480,
  },
  eyebrow: {
    fontFamily: tokens.font.sansMedium,
    fontSize: 12.5,
    color: tokens.color.inkMuted,
  },
  headingTablet: {
    marginTop: 10,
    fontFamily: tokens.font.display,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.4,
    color: tokens.color.ink,
  },
  descTablet: {
    marginTop: 14,
    fontFamily: tokens.font.sans,
    fontSize: 15.5,
    lineHeight: 24,
    color: tokens.color.inkSoft,
  },

  /* Phone */
  phoneRoot: {
    flex: 1,
    backgroundColor: tokens.color.app,
  },
  phoneScroll: {
    flex: 1,
  },
  phoneContent: {
    flexGrow: 1,
  },
  phoneHeader: {
    backgroundColor: tokens.color.brand,
    paddingBottom: 34,
  },
  headingPhone: {
    marginTop: 30,
    fontFamily: tokens.font.display,
    fontSize: 32,
    lineHeight: 35,
    letterSpacing: -1.1,
    color: WHITE,
  },
  descPhone: {
    marginTop: 12,
    fontFamily: tokens.font.sans,
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(255,255,255,0.78)",
  },
  phoneForm: {
    paddingTop: 26,
  },

  /* Shared field */
  fieldLabel: {
    fontFamily: tokens.font.sansMedium,
    fontSize: 12.5,
    color: tokens.color.inkMuted,
  },
  inputWrap: {
    marginTop: 9,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.surface,
    borderWidth: 1.5,
    borderColor: tokens.color.accentBrand,
    justifyContent: "center",
    // Focus ring approximation (0 0 0 4px accent/0.12).
    shadowColor: tokens.color.accentBrand,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  input: {
    fontFamily: tokens.font.sansSemiBold,
    letterSpacing: -0.2,
    color: tokens.color.ink,
    padding: 0,
  },
  hint: {
    marginTop: 9,
    fontFamily: tokens.font.sans,
    fontSize: 12.5,
    color: tokens.color.inkMuted,
  },
  errorText: {
    marginTop: 9,
    fontFamily: tokens.font.sans,
    fontSize: 12.5,
    color: tokens.color.danger,
  },

  /* CTA */
  cta: {
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.accentBrand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: tokens.color.accentBrand,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  ctaDisabled: {
    opacity: 0.55,
  },
  ctaLabel: {
    fontFamily: tokens.font.display,
    color: WHITE,
    letterSpacing: -0.2,
  },
  settingsNote: {
    marginTop: 18,
    textAlign: "center",
    fontFamily: tokens.font.sans,
    fontSize: 12.5,
    color: tokens.color.inkFaint,
  },

  /* Brand panel / header */
  brandPanel: {
    width: 512,
    flexShrink: 0,
    backgroundColor: tokens.color.brand,
    paddingRight: 52,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  brandMark: {
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: {
    fontFamily: tokens.font.displayBlack,
    color: tokens.color.brand,
    letterSpacing: -0.6,
  },
  brandName: {
    fontFamily: tokens.font.display,
    fontSize: 16,
    color: WHITE,
    letterSpacing: -0.3,
  },
  brandSub: {
    marginTop: 1,
    fontFamily: tokens.font.sans,
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  brandHeadline: {
    fontFamily: tokens.font.display,
    fontSize: 52,
    lineHeight: 54,
    letterSpacing: -2,
    color: WHITE,
  },
  brandBody: {
    marginTop: 22,
    maxWidth: 380,
    fontFamily: tokens.font.sans,
    fontSize: 16,
    lineHeight: 25,
    color: "rgba(255,255,255,0.78)",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandFeature: {
    fontFamily: tokens.font.sans,
    fontSize: 14.5,
    color: "rgba(255,255,255,0.9)",
  },
  brandFooter: {
    fontFamily: tokens.font.sans,
    fontSize: 12.5,
    color: "rgba(255,255,255,0.6)",
  },
});
