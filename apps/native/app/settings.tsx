import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/pos/pressable-scale";
import { useDatabase } from "@/contexts/database-context";
import { clearAllData, settingsQueries, shortName } from "@/lib/db/database";
import { resetPrinterAddress } from "@/lib/printer";
import { useIsTablet } from "@/lib/responsive";
import { tokens } from "@/lib/theme";

export default function SettingsScreen() {
  const isTablet = useIsTablet();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { db, isReady } = useDatabase();

  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isReady || !db) return;
    settingsQueries.getOperator(db).then((op) => setName(op?.name ?? ""));
  }, [isReady, db]);

  const preview = name.trim() ? shortName(name.trim()) : "";
  const canSave = name.trim().length > 0 && !saving;

  const save = async () => {
    if (!db || !canSave) return;
    setSaving(true);
    await settingsQueries.setOperator(db, name);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const clearAll = () => {
    Alert.alert(
      "Clear all data?",
      "This deletes every sale, product and setting on this device and returns it to first-time setup. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear everything",
          style: "destructive",
          onPress: async () => {
            if (!db) return;
            try {
              await clearAllData(db);
              resetPrinterAddress();
              router.replace("/first-run");
            } catch (e) {
              Alert.alert("Couldn't clear data", e instanceof Error ? e.message : "Something went wrong.");
            }
          },
        },
      ],
    );
  };

  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={tokens.color.inkStrong} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.sub}>Smart Switch Mobile · Till 01</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
          isTablet && styles.contentTablet,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.titleBar} />
            <Text style={styles.cardTitle}>Cashier</Text>
          </View>
          <Text style={styles.fieldLabel}>Name on receipts</Text>
          <View style={styles.input}>
            <TextInput
              value={name}
              onChangeText={(v) => {
                setName(v);
                setSaved(false);
              }}
              editable={isReady}
              placeholder="e.g. Tanaka Moyo"
              placeholderTextColor={tokens.color.inkSubtle}
              autoCapitalize="words"
              autoCorrect={false}
              style={styles.inputText}
            />
          </View>
          {!!preview && <Text style={styles.hint}>Shown as “{preview}” on receipts</Text>}

          <PressableScale onPress={save} disabled={!canSave} style={[styles.saveBtn, !canSave && { opacity: 0.5 }]}>
            <Ionicons
              name={saved ? "checkmark" : "save-outline"}
              size={17}
              color={tokens.color.accentForeground}
            />
            <Text style={styles.saveText}>{saved ? "Saved" : saving ? "Saving…" : "Save"}</Text>
          </PressableScale>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.titleBar} />
            <Text style={styles.cardTitle}>This till</Text>
          </View>
          <InfoRow label="Device" value="Till 01" />
          <InfoRow label="Mode" value="Offline · saved on this device" />
          <InfoRow label="Currency" value="USD" />
          <InfoRow label="Payments" value="Cash · EcoCash · OneMoney" />
          <InfoRow label="Version" value={version} last />
        </View>

        <View style={styles.offlineCard}>
          <View style={styles.offlineDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.offlineTitle}>Offline ready</Text>
            <Text style={styles.offlineBody}>Sales, stock and receipts never leave this device.</Text>
          </View>
        </View>

        <View style={styles.dangerCard}>
          <View style={styles.cardTitleRow}>
            <View style={styles.titleBar} />
            <Text style={styles.cardTitle}>Danger zone</Text>
          </View>
          <Text style={styles.dangerBody}>
            Wipe this till back to factory-first-run. Every sale, product and setting is removed.
          </Text>
          <PressableScale onPress={clearAll} style={styles.clearBtn}>
            <Ionicons name="trash-outline" size={17} color="#FFFFFF" />
            <Text style={styles.clearText}>Clear all data</Text>
          </PressableScale>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const CARD_SHADOW = {
  shadowColor: "#1B2A44",
  shadowOpacity: 0.06,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.color.app },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: tokens.color.surface, borderWidth: 1, borderColor: tokens.color.border, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: tokens.font.display, fontSize: 20, color: tokens.color.ink, letterSpacing: -0.5 },
  sub: { marginTop: 2, fontFamily: tokens.font.sans, fontSize: 11.5, color: tokens.color.inkSoft },

  content: { padding: 16, gap: 14 },
  contentTablet: { width: "100%", maxWidth: 560, alignSelf: "center" },

  card: { backgroundColor: tokens.color.surface, borderRadius: 20, borderWidth: 1, borderColor: tokens.color.border, padding: 20, ...CARD_SHADOW },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 14 },
  titleBar: { width: 3, height: 15, borderRadius: 2, backgroundColor: tokens.color.accentBrand },
  cardTitle: { fontFamily: tokens.font.display, fontSize: 16, color: tokens.color.ink, letterSpacing: -0.3 },

  fieldLabel: { fontFamily: tokens.font.sansMedium, fontSize: 12.5, color: tokens.color.inkMuted },
  input: { height: 50, marginTop: 8, borderWidth: 1, borderColor: tokens.color.borderMuted, borderRadius: 12, paddingHorizontal: 14, justifyContent: "center", backgroundColor: tokens.color.surface },
  inputText: { fontFamily: tokens.font.sansMedium, fontSize: 15, color: tokens.color.ink, padding: 0 },
  hint: { marginTop: 9, fontFamily: tokens.font.sans, fontSize: 12, color: tokens.color.inkMuted },

  saveBtn: {
    height: 48,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: tokens.color.accentBrand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveText: { fontFamily: tokens.font.sansBold, fontSize: 14.5, color: tokens.color.accentForeground },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.surfaceMuted,
  },
  infoLabel: { fontFamily: tokens.font.sans, fontSize: 13, color: tokens.color.inkSoft },
  infoValue: { fontFamily: tokens.font.sansSemiBold, fontSize: 13, color: tokens.color.ink, flexShrink: 1, textAlign: "right" },

  offlineCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, borderRadius: 14, backgroundColor: tokens.color.successBg },
  offlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.color.successStrong },
  offlineTitle: { fontFamily: tokens.font.sansBold, fontSize: 13, color: tokens.color.success },
  offlineBody: { marginTop: 2, fontFamily: tokens.font.sans, fontSize: 11.5, color: tokens.color.success, opacity: 0.85 },

  dangerCard: { backgroundColor: tokens.color.surface, borderRadius: 20, borderWidth: 1, borderColor: tokens.color.dangerBorder, padding: 20, ...CARD_SHADOW },
  dangerBody: { fontFamily: tokens.font.sans, fontSize: 12.5, lineHeight: 19, color: tokens.color.inkMuted },
  clearBtn: {
    height: 48,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: tokens.color.danger,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  clearText: { fontFamily: tokens.font.sansBold, fontSize: 14.5, color: "#FFFFFF" },
});
