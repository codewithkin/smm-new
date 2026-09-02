import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/pos/pressable-scale";
import { useDatabase } from "@/contexts/database-context";
import { productQueries, stockQueries } from "@/lib/db/database";
import { CATEGORY_META, formatCurrency, formatTime } from "@/lib/format";
import { adjustStock } from "@/lib/pos";
import { useIsTablet } from "@/lib/responsive";
import { tokens } from "@/lib/theme";
import type { Product, StockMovement, StockMovementType } from "@/lib/types";

type Action = { key: StockMovementType; label: string; sub: string };

const ACTIONS: Action[] = [
  { key: "restock", label: "Restock", sub: "New delivery in" },
  { key: "loss", label: "Loss", sub: "Damage or theft" },
  { key: "adjust", label: "Count", sub: "Correct to actual" },
  { key: "sale-return", label: "Return", sub: "Back from a sale" },
];

const ADDS = (t: StockMovementType) => t === "restock" || t === "sale-return";

function movementBadge(t: StockMovementType): { bg: string; fg: string; label: string } {
  switch (t) {
    case "restock":
      return { bg: "#E7EEFB", fg: tokens.color.brandDark, label: "Restock" };
    case "sale-return":
      return { bg: tokens.color.successBg, fg: tokens.color.success, label: "Return" };
    case "loss":
      return { bg: tokens.color.warningBg, fg: tokens.color.warning, label: "Loss" };
    case "sale":
      return { bg: tokens.color.surfaceMuted, fg: tokens.color.inkStrong, label: "Sale" };
    default:
      return { bg: tokens.color.surfaceMuted, fg: tokens.color.inkStrong, label: "Adjust" };
  }
}

function whenLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const isYest = d.toDateString() === yest.toDateString();
  if (sameDay) return `Today ${formatTime(ts)}`;
  if (isYest) return `Yesterday ${formatTime(ts)}`;
  return d.toLocaleDateString([], { day: "numeric", month: "short" }) + `, ${formatTime(ts)}`;
}

export default function StockScreen() {
  const isTablet = useIsTablet();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { db } = useDatabase();
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);

  const [product, setProduct] = useState<Product | null>(null);
  const [ledger, setLedger] = useState<StockMovement[]>([]);
  const [action, setAction] = useState<StockMovementType>("restock");
  const [qty, setQty] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!db || !Number.isFinite(productId)) return;
    const [p, hist] = await Promise.all([
      productQueries.getById(db, productId),
      stockQueries.getHistory(db, productId),
    ]);
    setProduct(p);
    setLedger(hist);
  }, [db, productId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const stock = product?.stock ?? 0;
  const delta = ADDS(action) ? qty : -qty;
  const balanceAfter = Math.max(0, stock + delta);
  const stockValue = product ? product.stock * product.cost : 0;
  const capacity = Math.max(stock, (product?.lowStockThreshold ?? 0) * 5, 10);
  const fill = Math.min(1, stock / capacity);

  const record = async () => {
    if (!db || !product || saving || qty <= 0) return;
    setSaving(true);
    setError(null);
    const res = await adjustStock(db, product.id, { type: action, quantity: qty });
    setSaving(false);
    if (res.ok) {
      setQty(1);
      reload();
    } else {
      setError(res.error ?? "Could not record adjustment");
    }
  };

  const currentActionLabel = ACTIONS.find((a) => a.key === action)?.label ?? "Adjust";

  const header = (
    <View style={[styles.header, isTablet && styles.headerTablet]}>
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={22} color={tokens.color.inkStrong} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.title}>{product?.name ?? "Stock"}</Text>
        <Text style={styles.sub}>
          {product ? `${product.sku} · ${CATEGORY_META[product.category].label}` : ""}
        </Text>
      </View>
      {isTablet && (
        <View style={styles.okChip}>
          <View style={styles.okDot} />
          <Text style={styles.okText}>Ledger up to date</Text>
        </View>
      )}
    </View>
  );

  const currentStockCard = (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Current stock</Text>
      <View style={styles.stockNumRow}>
        <Text style={styles.stockNum}>{stock}</Text>
        <Text style={styles.stockUnits}>units</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${Math.round(fill * 100)}%` }]} />
      </View>
      <View style={styles.metaRow}>
        <View>
          <Text style={styles.metaLabel}>Reorder point</Text>
          <Text style={styles.metaValue}>{product?.lowStockThreshold ?? 0} units</Text>
        </View>
        <View>
          <Text style={styles.metaLabel}>Stock value</Text>
          <Text style={styles.metaValue}>{formatCurrency(stockValue)}</Text>
        </View>
      </View>
    </View>
  );

  const adjustCard = (
    <View style={[styles.card, isTablet && { flex: 1, minHeight: 0 }]}>
      <View style={styles.cardTitleRow}>
        <View style={styles.titleBar} />
        <Text style={styles.cardTitle}>Adjust stock</Text>
      </View>

      <View style={styles.actionGrid}>
        {ACTIONS.map((a) => {
          const active = action === a.key;
          return (
            <PressableScale
              key={a.key}
              onPress={() => setAction(a.key)}
              style={[styles.actionBtn, active ? styles.actionActive : styles.actionIdle]}
            >
              <Text style={[styles.actionLabel, active && { color: tokens.color.brandDark }]}>{a.label}</Text>
              <Text style={[styles.actionSub, active && { color: tokens.color.accentBrand }]}>{a.sub}</Text>
            </PressableScale>
          );
        })}
      </View>

      <View style={styles.qtyBox}>
        <Text style={styles.qtyLabel}>Quantity</Text>
        <View style={styles.stepper}>
          <PressableScale onPress={() => setQty((q) => Math.max(1, q - 1))} style={styles.stepBtn}>
            <Text style={styles.stepGlyph}>−</Text>
          </PressableScale>
          <View style={styles.qtyValue}>
            <Text style={styles.qtyValueText}>{qty}</Text>
          </View>
          <PressableScale onPress={() => setQty((q) => q + 1)} style={styles.stepBtn}>
            <Text style={styles.stepGlyph}>+</Text>
          </PressableScale>
        </View>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Balance after this change</Text>
          <Text style={styles.balanceValue}>{balanceAfter} units</Text>
        </View>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
      {isTablet && <View style={{ flex: 1 }} />}

      <PressableScale onPress={record} disabled={saving} style={[styles.recordBtn, saving && { opacity: 0.6 }]}>
        <Text style={styles.recordText}>Record {currentActionLabel.toLowerCase()}</Text>
        <Text style={styles.recordAmount}>
          {ADDS(action) ? "+" : "−"}
          {qty} units
        </Text>
      </PressableScale>
    </View>
  );

  const ledgerHeader = (
    <View style={styles.cardTitleRow}>
      <View style={styles.titleBar} />
      <Text style={styles.cardTitle}>Movement ledger</Text>
      <View style={{ flex: 1 }} />
      <Text style={styles.ledgerCount}>{ledger.length} entries</Text>
    </View>
  );

  if (isTablet) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {header}
        <View style={styles.tabletBody}>
          <View style={styles.tabletLeft}>
            {currentStockCard}
            {adjustCard}
          </View>
          <View style={[styles.card, styles.ledgerCard]}>
            <View style={{ paddingHorizontal: 4, paddingBottom: 6 }}>{ledgerHeader}</View>
            <View style={[styles.rowGrid, styles.ledgerHead]}>
              <Text style={[styles.headCell, styles.colType]}>Type</Text>
              <Text style={[styles.headCell, styles.colChange]}>Change</Text>
              <Text style={[styles.headCell, styles.colBalance]}>Balance</Text>
              <Text style={[styles.headCell, styles.colNote]}>Note</Text>
              <Text style={[styles.headCell, styles.colWhen]}>When</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {ledger.length === 0 ? (
                <EmptyLedger />
              ) : (
                ledger.map((m, i) => <LedgerTableRow key={m.id} m={m} last={i === ledger.length - 1} />)
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {header}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {currentStockCard}
        {adjustCard}
        <View style={{ marginTop: 2 }}>{ledgerHeader}</View>
        <View style={[styles.card, { padding: 0, overflow: "hidden" }]}>
          {ledger.length === 0 ? (
            <EmptyLedger />
          ) : (
            ledger.map((m, i) => <LedgerPhoneRow key={m.id} m={m} last={i === ledger.length - 1} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function ChangeText({ q }: { q: number }) {
  const positive = q >= 0;
  return (
    <Text style={[styles.changeText, { color: positive ? tokens.color.success : tokens.color.danger }]}>
      {positive ? "+" : "−"}
      {Math.abs(q)}
    </Text>
  );
}

function TypeBadge({ type }: { type: StockMovementType }) {
  const b = movementBadge(type);
  return (
    <View style={[styles.typeBadge, { backgroundColor: b.bg }]}>
      <Text style={[styles.typeBadgeText, { color: b.fg }]}>{b.label}</Text>
    </View>
  );
}

function LedgerTableRow({ m, last }: { m: StockMovement; last: boolean }) {
  return (
    <View style={[styles.rowGrid, styles.ledgerRow, last && { borderBottomWidth: 0 }]}>
      <View style={styles.colType}>
        <TypeBadge type={m.type} />
      </View>
      <View style={[styles.colChange, { alignItems: "flex-end" }]}>
        <ChangeText q={m.quantity} />
      </View>
      <Text style={[styles.balCell, styles.colBalance]}>{m.balanceAfter}</Text>
      <Text style={[styles.noteCell, styles.colNote]} numberOfLines={1}>
        {m.note ?? "—"}
      </Text>
      <Text style={[styles.whenCell, styles.colWhen]}>{whenLabel(m.createdAt)}</Text>
    </View>
  );
}

function LedgerPhoneRow({ m, last }: { m: StockMovement; last: boolean }) {
  const b = movementBadge(m.type);
  return (
    <View style={[styles.phoneRow, last && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.phoneRowTitle}>
          {b.label}
          {m.note ? ` · ${m.note}` : ""}
        </Text>
        <Text style={styles.phoneRowSub}>
          {whenLabel(m.createdAt)} · balance {m.balanceAfter}
        </Text>
      </View>
      <ChangeText q={m.quantity} />
    </View>
  );
}

function EmptyLedger() {
  return (
    <View style={styles.emptyLedger}>
      <Ionicons name="swap-vertical-outline" size={34} color={tokens.color.inkSubtle} />
      <Text style={styles.emptyText}>No movements yet</Text>
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
  headerTablet: { paddingHorizontal: 18, paddingTop: 16, gap: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: tokens.color.surface, borderWidth: 1, borderColor: tokens.color.border, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: tokens.font.display, fontSize: 17, color: tokens.color.ink, letterSpacing: -0.4 },
  sub: { marginTop: 2, fontFamily: tokens.font.mono, fontSize: 11.5, color: tokens.color.inkSoft },
  okChip: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 6, paddingLeft: 10, paddingRight: 12, borderRadius: 9, backgroundColor: tokens.color.successBg },
  okDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: tokens.color.successStrong },
  okText: { fontFamily: tokens.font.sansSemiBold, fontSize: 12, color: tokens.color.success },

  tabletBody: { flex: 1, flexDirection: "row", gap: 12, minHeight: 0, paddingHorizontal: 18, paddingBottom: 18 },
  tabletLeft: { width: 400, gap: 12 },

  card: { backgroundColor: tokens.color.surface, borderRadius: 20, borderWidth: 1, borderColor: tokens.color.border, padding: 20, ...CARD_SHADOW },
  ledgerCard: { flex: 1, minWidth: 0, padding: 16 },

  cardLabel: { fontFamily: tokens.font.sansMedium, fontSize: 12.5, color: tokens.color.inkMuted },
  stockNumRow: { flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 6 },
  stockNum: { fontFamily: tokens.font.displayBlack, fontSize: 52, color: tokens.color.ink, letterSpacing: -2 },
  stockUnits: { fontFamily: tokens.font.sansSemiBold, fontSize: 15, color: tokens.color.inkSoft },
  track: { height: 8, borderRadius: 5, backgroundColor: tokens.color.surfaceSunken, marginTop: 16, overflow: "hidden" },
  trackFill: { height: "100%", borderRadius: 5, backgroundColor: tokens.color.accentBrand },
  metaRow: { flexDirection: "row", gap: 28, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: tokens.color.surfaceSunken },
  metaLabel: { fontFamily: tokens.font.sans, fontSize: 11.5, color: tokens.color.inkFaint },
  metaValue: { marginTop: 3, fontFamily: tokens.font.sansBold, fontSize: 17, color: tokens.color.ink },

  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  titleBar: { width: 3, height: 15, borderRadius: 2, backgroundColor: tokens.color.accentBrand },
  cardTitle: { fontFamily: tokens.font.display, fontSize: 16, color: tokens.color.ink, letterSpacing: -0.3 },
  ledgerCount: { fontFamily: tokens.font.sans, fontSize: 12, color: tokens.color.inkSoft },

  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  actionBtn: { flexGrow: 1, flexBasis: "45%", padding: 12, borderRadius: 13, borderWidth: 1.5 },
  actionIdle: { backgroundColor: tokens.color.surface, borderColor: tokens.color.borderMuted },
  actionActive: { backgroundColor: "#E9F0FC", borderColor: tokens.color.accentBrand },
  actionLabel: { fontFamily: tokens.font.sansBold, fontSize: 14, color: tokens.color.ink },
  actionSub: { marginTop: 2, fontFamily: tokens.font.sans, fontSize: 11.5, color: tokens.color.inkSoft },

  qtyBox: { marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: tokens.color.panel },
  qtyLabel: { fontFamily: tokens.font.sansMedium, fontSize: 12.5, color: tokens.color.inkSoft },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  stepBtn: { width: 52, height: 52, borderRadius: 12, backgroundColor: tokens.color.surfaceMuted, alignItems: "center", justifyContent: "center" },
  stepGlyph: { fontFamily: tokens.font.sansSemiBold, fontSize: 21, color: tokens.color.inkStrong },
  qtyValue: { flex: 1, height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: tokens.color.accentBrand, alignItems: "center", justifyContent: "center" },
  qtyValueText: { fontFamily: tokens.font.sansBold, fontSize: 22, color: tokens.color.ink },
  balanceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 15, paddingTop: 14, borderTopWidth: 1, borderTopColor: tokens.color.borderMuted },
  balanceLabel: { fontFamily: tokens.font.sans, fontSize: 12.5, color: tokens.color.inkSoft },
  balanceValue: { fontFamily: tokens.font.display, fontSize: 19, color: tokens.color.ink, letterSpacing: -0.4 },

  error: { marginTop: 12, fontFamily: tokens.font.sansMedium, fontSize: 12.5, color: tokens.color.danger },

  recordBtn: {
    height: 56,
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: tokens.color.accentBrand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    shadowColor: tokens.color.accentBrand,
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  recordText: { fontFamily: tokens.font.display, fontSize: 15.5, color: tokens.color.accentForeground, letterSpacing: -0.2 },
  recordAmount: { fontFamily: tokens.font.sansBold, fontSize: 15.5, color: tokens.color.accentForeground },

  rowGrid: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18 },
  ledgerHead: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: tokens.color.borderMuted },
  headCell: { fontFamily: tokens.font.sansMedium, fontSize: 12.5, color: tokens.color.inkMuted },
  ledgerRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: tokens.color.surfaceMuted },
  colType: { width: 110 },
  colChange: { width: 80 },
  colBalance: { width: 90, textAlign: "right" },
  colNote: { flex: 1, minWidth: 0 },
  colWhen: { width: 140, textAlign: "right" },
  balCell: { fontFamily: tokens.font.sansSemiBold, fontSize: 13.5, color: tokens.color.ink, textAlign: "right" },
  noteCell: { fontFamily: tokens.font.sans, fontSize: 12.5, color: tokens.color.inkSoft },
  whenCell: { fontFamily: tokens.font.sans, fontSize: 12.5, color: tokens.color.inkSoft, textAlign: "right" },
  changeText: { fontFamily: tokens.font.sansBold, fontSize: 13.5 },

  typeBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7 },
  typeBadgeText: { fontFamily: tokens.font.sansSemiBold, fontSize: 11.5 },

  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.surfaceMuted,
  },
  phoneRowTitle: { fontFamily: tokens.font.sansSemiBold, fontSize: 13, color: tokens.color.ink },
  phoneRowSub: { marginTop: 2, fontFamily: tokens.font.sans, fontSize: 11.5, color: tokens.color.inkMuted },

  emptyLedger: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 8 },
  emptyText: { fontFamily: tokens.font.sansSemiBold, fontSize: 14, color: tokens.color.inkSoft },
});
