import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
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

  // Collapse to the stacked phone layout on narrow screens; split-panel otherwise.
  const stacked = width < 760;

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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: tokens.color.app }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={{ flex: 1, flexDirection: stacked ? "column" : "row", paddingTop: insets.top }}
      >
        {!stacked && <BrandPanel />}

        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 56 }}>
          <View style={{ width: "100%", maxWidth: 480 }}>
            {stacked && (
              <Text style={{ ...styles.eyebrow, color: tokens.color.inkMuted }}>
                Step 1 of 1
              </Text>
            )}
            <Text style={styles.heading}>
              Who is behind{`\n`}the counter?
            </Text>
            <Text style={styles.description}>
              {stacked
                ? "Your name appears on receipts and on every sale in the history."
                : "Your name shows on receipts and on every sale in the history, so the owner can see who rang it up."}
            </Text>

            <View style={{ marginTop: 26, width: "100%" }}>
              <Text style={styles.fieldLabel}>Your name</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={name}
                  onChangeText={(v) => {
                    setName(v);
                    setError(null);
                  }}
                  editable={isReady}
                  placeholder="e.g. Tanaka Moyo"
                  placeholderTextColor={tokens.color.inkMuted}
                  autoCorrect={false}
                  autoCapitalize="words"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={submit}
                  style={styles.input}
                />
              </View>
              {!!hint && <Text style={styles.hint}>{hint}</Text>}
              {!!error && <Text style={styles.error}>{error}</Text>}
            </View>

            <Pressable
              onPress={submit}
              disabled={!canSubmit}
              style={[styles.cta, !canSubmit && { opacity: 0.55 }]}
            >
              <Text style={styles.ctaLabel}>Start selling</Text>
              <Ionicons name="arrow-forward" size={17} color="#fff" />
            </Pressable>

            <Text style={styles.settingsNote}>You can change this any time in Settings</Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function BrandPanel() {
  return (
    <View style={{ width: 512, flexShrink: 0, backgroundColor: tokens.color.brand, padding: 52 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
        <View style={styles.brandMarkSmall}>
          <Text style={styles.brandMarkText}>S</Text>
        </View>
        <View>
          <Text style={styles.brandName}>Smart Switch Mobile</Text>
          <Text style={styles.brandSub}>Point of sale · Harare</Text>
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <Text style={styles.brandHeadline}>Everything{`\n`}on this till,{`\n`}offline.</Text>
      <Text style={styles.brandBody}>
        Sales, stock and receipts are stored on this device. No account, no data bundle, no
        waiting for a network.
      </Text>

      <View style={{ marginTop: 30, gap: 14 }}>
        {FEATURES.map((feature) => (
          <View key={feature} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={styles.checkCircle}>
              <Text style={styles.checkMark}>✓</Text>
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

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 12.5,
    fontFamily: tokens.font.sans,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  heading: {
    marginTop: 10,
    fontFamily: tokens.font.display,
    fontSize: 40,
    lineHeight: 44,
    color: tokens.color.ink,
    letterSpacing: -1,
  },
  description: {
    marginTop: 14,
    fontFamily: tokens.font.sans,
    fontSize: 15.5,
    lineHeight: 23,
    color: tokens.color.inkSoft,
  },
  fieldLabel: {
    fontFamily: tokens.font.sansMedium,
    fontSize: 12.5,
    color: tokens.color.inkSoft,
  },
  inputWrap: {
    marginTop: 9,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: tokens.color.accentBrand,
    justifyContent: "center",
    paddingHorizontal: 20,
    shadowColor: tokens.color.accentBrand,
    shadowOpacity: 0.12,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  input: {
    fontFamily: tokens.font.sansSemiBold,
    fontSize: 19,
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
  error: {
    marginTop: 9,
    fontFamily: tokens.font.sans,
    fontSize: 12.5,
    color: "#C0342E",
  },
  cta: {
    marginTop: 30,
    height: 60,
    borderRadius: 16,
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
  ctaLabel: {
    fontFamily: tokens.font.display,
    fontSize: 17,
    color: "#fff",
    letterSpacing: -0.2,
  },
  settingsNote: {
    marginTop: 18,
    textAlign: "center",
    fontFamily: tokens.font.sans,
    fontSize: 12.5,
    color: tokens.color.inkFaint,
  },
  brandMarkSmall: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: {
    fontFamily: tokens.font.displayBlack,
    fontSize: 20,
    color: tokens.color.brand,
    letterSpacing: -0.8,
  },
  brandName: {
    fontFamily: tokens.font.display,
    fontSize: 17,
    color: "#fff",
    letterSpacing: -0.4,
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
    color: "#fff",
    letterSpacing: -2,
  },
  brandBody: {
    marginTop: 22,
    fontFamily: tokens.font.sans,
    fontSize: 16,
    lineHeight: 25,
    color: "rgba(255,255,255,0.78)",
    maxWidth: 380,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
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