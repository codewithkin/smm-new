import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/pos/pressable-scale";
import { useDatabase } from "@/contexts/database-context";
import { productQueries } from "@/lib/db/database";
import { CATEGORIES, CATEGORY_META } from "@/lib/format";
import { useIsTablet } from "@/lib/responsive";
import { tokens } from "@/lib/theme";
import type { Category } from "@/lib/types";

export default function ProductFormScreen() {
  const isTablet = useIsTablet();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { db } = useDatabase();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = id ? Number(id) : null;
  const isEdit = editId != null && Number.isFinite(editId);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState<Category>("smartphone");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [openingStock, setOpeningStock] = useState("");
  const [lowAt, setLowAt] = useState("5");
  const [active, setActive] = useState(true);
  const [currentStock, setCurrentStock] = useState(0);

  const [skuConflict, setSkuConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load the product in edit mode.
  useEffect(() => {
    if (!db || !isEdit || editId == null) return;
    productQueries.getById(db, editId).then((p) => {
      if (!p) return;
      setName(p.name);
      setSku(p.sku);
      setCategory(p.category);
      setPrice(String(p.price));
      setCost(String(p.cost));
      setLowAt(String(p.lowStockThreshold));
      setActive(p.active);
      setCurrentStock(p.stock);
    });
  }, [db, isEdit, editId]);

  // Live SKU availability check.
  useEffect(() => {
    if (!db || !sku.trim()) {
      setSkuConflict(false);
      return;
    }
    let active = true;
    productQueries.findSkuConflict(db, sku, editId ?? undefined).then((conflictId) => {
      if (active) setSkuConflict(conflictId != null);
    });
    return () => {
      active = false;
    };
  }, [db, sku, editId]);

  const close = () => router.back();

  const save = async () => {
    if (!db || saving) return;
    setError(null);
    if (!name.trim()) return setError("Product name is required");
    if (!sku.trim()) return setError("SKU is required");
    if (skuConflict) return setError("That SKU is already in use");
    const priceNum = parseFloat(price) || 0;
    const costNum = parseFloat(cost) || 0;
    const lowNum = Math.max(0, Math.trunc(parseFloat(lowAt) || 0));

    setSaving(true);
    try {
      if (isEdit && editId != null) {
        await productQueries.update(db, editId, {
          name: name.trim(),
          sku: sku.trim(),
          price: priceNum,
          cost: costNum,
          lowStockThreshold: lowNum,
          category,
          active,
        });
      } else {
        await productQueries.create(db, {
          name: name.trim(),
          sku: sku.trim(),
          price: priceNum,
          cost: costNum,
          stock: Math.max(0, Math.trunc(parseFloat(openingStock) || 0)),
          lowStockThreshold: lowNum,
          category,
        });
      }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save product");
      setSaving(false);
    }
  };

  const skuHint = useMemo(() => {
    if (!sku.trim()) return null;
    return skuConflict
      ? { text: "SKU already in use", color: tokens.color.danger }
      : { text: "SKU is available", color: tokens.color.success };
  }, [sku, skuConflict]);

  const categorySelector = (
    <View style={styles.segment}>
      {CATEGORIES.map((cat) => {
        const activeCat = category === cat;
        return (
          <PressableScale
            key={cat}
            onPress={() => setCategory(cat)}
            style={[styles.segmentBtn, activeCat ? styles.segmentActive : styles.segmentIdle]}
          >
            <Text style={[styles.segmentText, activeCat && { color: tokens.color.brandDark }]}>
              {CATEGORY_META[cat].short}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );

  const stockField = isEdit ? (
    <Field label="Current stock">
      <View style={[styles.input, styles.inputReadonly]}>
        <Text style={styles.readonlyText}>{currentStock} units</Text>
        <Pressable onPress={() => editId != null && router.replace({ pathname: "/stock/[id]", params: { id: String(editId) } })}>
          <Text style={styles.manageLink}>Manage stock</Text>
        </Pressable>
      </View>
    </Field>
  ) : (
    <Field label="Opening stock">
      <TextInput value={openingStock} onChangeText={setOpeningStock} keyboardType="number-pad" placeholder="0" placeholderTextColor={tokens.color.inkSubtle} style={styles.inputText} />
    </Field>
  );

  const fields = (
    <>
      <Field label="Product name" full>
        <TextInput value={name} onChangeText={setName} placeholder="e.g. Samsung Galaxy A15" placeholderTextColor={tokens.color.inkSubtle} style={styles.inputText} />
      </Field>
      <Field label="SKU" hint={skuHint}>
        <TextInput value={sku} onChangeText={setSku} autoCapitalize="characters" autoCorrect={false} placeholder="e.g. SM-A155-128" placeholderTextColor={tokens.color.inkSubtle} style={[styles.inputText, { fontFamily: tokens.font.mono, fontSize: 13.5 }]} />
      </Field>
      <Field label="Category" bare>{categorySelector}</Field>
      <Field label="Selling price (USD)">
        <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={tokens.color.inkSubtle} style={styles.inputText} />
      </Field>
      <Field label="Cost price (USD)">
        <TextInput value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={tokens.color.inkSubtle} style={styles.inputText} />
      </Field>
      {stockField}
      <Field label="Low-stock threshold">
        <TextInput value={lowAt} onChangeText={setLowAt} keyboardType="number-pad" placeholder="5" placeholderTextColor={tokens.color.inkSubtle} style={styles.inputText} />
      </Field>
      <View style={styles.activeCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.activeTitle}>Active in Point of Sale</Text>
          <Text style={styles.activeSub}>Inactive products stay in reports but leave the grid</Text>
        </View>
        <Switch
          value={active}
          onValueChange={setActive}
          trackColor={{ true: tokens.color.accentBrand, false: tokens.color.borderStrong }}
          thumbColor="#fff"
        />
      </View>
    </>
  );

  const header = (
    <View style={styles.header}>
      {!isTablet && (
        <Pressable onPress={close} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="close" size={20} color={tokens.color.inkStrong} />
        </Pressable>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.title}>{isEdit ? "Edit product" : "New product"}</Text>
        <Text style={styles.subtitle}>
          {isEdit ? "Stock changes are made from the stock screen" : "Add a product to your catalog"}
        </Text>
      </View>
      {isTablet && (
        <Pressable onPress={close} hitSlop={10} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={tokens.color.inkStrong} />
        </Pressable>
      )}
    </View>
  );

  const actions = (
    <View style={styles.actions}>
      <PressableScale onPress={close} style={styles.cancelBtn}>
        <Text style={styles.cancelText}>Cancel</Text>
      </PressableScale>
      <PressableScale onPress={save} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
        <Text style={styles.saveText}>{saving ? "Saving…" : "Save product"}</Text>
      </PressableScale>
    </View>
  );

  if (isTablet) {
    return (
      <Pressable style={styles.scrim} onPress={close}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          {header}
          <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={styles.gridBody} showsVerticalScrollIndicator={false}>
            {fields}
          </ScrollView>
          {!!error && <Text style={styles.errorTablet}>{error}</Text>}
          {actions}
        </Pressable>
      </Pressable>
    );
  }

  return (
    <View style={[styles.phoneRoot, { paddingTop: insets.top + 8 }]}>
      <View style={{ paddingHorizontal: 16 }}>{header}</View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
        {fields}
        {!!error && <Text style={styles.errorTablet}>{error}</Text>}
      </ScrollView>
      <View style={[styles.phoneFooter, { paddingBottom: insets.bottom + 20 }]}>{actions}</View>
    </View>
  );
}

function Field({
  label,
  children,
  full,
  bare,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
  /** Render children directly (no bordered input box) — for custom controls. */
  bare?: boolean;
  hint?: { text: string; color: string } | null;
}) {
  return (
    <View style={[styles.field, full && styles.fieldFull]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {bare ? <View style={{ marginTop: 7 }}>{children}</View> : <View style={styles.input}>{children}</View>}
      {hint && <Text style={[styles.fieldHint, { color: hint.color }]}>{hint.text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(31,37,47,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  dialog: {
    width: 720,
    maxWidth: "100%",
    backgroundColor: tokens.color.surface,
    borderRadius: 22,
    overflow: "hidden",
    paddingBottom: 6,
    shadowColor: "#1B2A44",
    shadowOpacity: 0.35,
    shadowRadius: 80,
    shadowOffset: { width: 0, height: 32 },
    elevation: 24,
  },
  phoneRoot: { flex: 1, backgroundColor: tokens.color.app },
  phoneFooter: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: tokens.color.surface, borderTopWidth: 1, borderTopColor: tokens.color.borderMuted },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 28,
    paddingTop: 22,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.surfaceMuted,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: tokens.color.surface, borderWidth: 1, borderColor: tokens.color.border, alignItems: "center", justifyContent: "center" },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: tokens.color.surfaceMuted, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: tokens.font.display, fontSize: 21, color: tokens.color.ink, letterSpacing: -0.5 },
  subtitle: { marginTop: 3, fontFamily: tokens.font.sans, fontSize: 12.5, color: tokens.color.inkSoft },

  gridBody: { flexDirection: "row", flexWrap: "wrap", gap: 16, paddingHorizontal: 28, paddingTop: 22, paddingBottom: 8 },
  field: { flexGrow: 1, flexBasis: "45%", minWidth: 200 },
  fieldFull: { flexBasis: "100%" },
  fieldLabel: { fontFamily: tokens.font.sansMedium, fontSize: 12.5, color: tokens.color.inkMuted },
  input: {
    minHeight: 48,
    marginTop: 7,
    borderWidth: 1,
    borderColor: tokens.color.borderMuted,
    borderRadius: 11,
    paddingHorizontal: 14,
    backgroundColor: tokens.color.surface,
    justifyContent: "center",
  },
  inputReadonly: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: tokens.color.surfaceMuted },
  readonlyText: { fontFamily: tokens.font.sansSemiBold, fontSize: 14.5, color: tokens.color.inkSoft },
  manageLink: { fontFamily: tokens.font.sansSemiBold, fontSize: 12, color: tokens.color.accentBrand },
  inputText: { fontFamily: tokens.font.sansMedium, fontSize: 14.5, color: tokens.color.ink, padding: 0, height: 46 },
  fieldHint: { marginTop: 6, fontFamily: tokens.font.sans, fontSize: 11.5 },

  segment: { flexDirection: "row", gap: 8 },
  segmentBtn: { flex: 1, height: 40, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  segmentIdle: { backgroundColor: tokens.color.surface, borderColor: tokens.color.borderMuted },
  segmentActive: { backgroundColor: "#E9F0FC", borderColor: tokens.color.accentBrand },
  segmentText: { fontFamily: tokens.font.sansSemiBold, fontSize: 12.5, color: tokens.color.ink },

  activeCard: {
    flexBasis: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: tokens.color.surfaceMuted,
  },
  activeTitle: { fontFamily: tokens.font.sansSemiBold, fontSize: 14, color: tokens.color.ink },
  activeSub: { marginTop: 2, fontFamily: tokens.font.sans, fontSize: 12, color: tokens.color.inkSoft },

  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, paddingHorizontal: 28, paddingVertical: 20 },
  cancelBtn: { flex: 1, maxWidth: 160, height: 50, borderRadius: 12, borderWidth: 1, borderColor: tokens.color.borderMuted, alignItems: "center", justifyContent: "center" },
  cancelText: { fontFamily: tokens.font.sansSemiBold, fontSize: 14.5, color: tokens.color.inkStrong },
  saveBtn: {
    flex: 1.6,
    height: 50,
    borderRadius: 12,
    backgroundColor: tokens.color.accentBrand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: tokens.color.accentBrand,
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveText: { fontFamily: tokens.font.sansBold, fontSize: 14.5, color: tokens.color.accentForeground },

  errorTablet: { paddingHorizontal: 28, fontFamily: tokens.font.sansMedium, fontSize: 12.5, color: tokens.color.danger },
});
