import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenScaffold } from "@/components/nav/screen-scaffold";
import { PressableScale } from "@/components/pos/pressable-scale";
import { useDatabase } from "@/contexts/database-context";
import { productQueries, stockQueries } from "@/lib/db/database";
import { CATEGORIES, CATEGORY_META, formatCurrency } from "@/lib/format";
import { useIsTablet } from "@/lib/responsive";
import { tokens } from "@/lib/theme";
import type { Category, Product } from "@/lib/types";

type StockState = "in-stock" | "low" | "out";
type CatFilter = Category | "all";

const LOW_ROW_TINT = "#FEF6E9";

function stateOf(p: Product): StockState {
  if (p.stock <= 0) return "out";
  if (p.stock <= p.lowStockThreshold) return "low";
  return "in-stock";
}

function stateBadge(s: StockState): { bg: string; fg: string; label: string } {
  if (s === "out") return { bg: tokens.color.dangerBg, fg: tokens.color.danger, label: "Out" };
  if (s === "low") return { bg: tokens.color.warningBg, fg: tokens.color.warning, label: "Low" };
  return { bg: tokens.color.successBg, fg: tokens.color.success, label: "In stock" };
}

export default function ProductsScreen() {
  const isTablet = useIsTablet();
  const { db, isReady } = useDatabase();
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState({ totalUnits: 0, stockValue: 0, outOfStock: 0, lowStock: 0 });
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<CatFilter>("all");
  const [lowOnly, setLowOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!db) return;
    const [list, sum] = await Promise.all([
      productQueries.list(db),
      stockQueries.getDashboardSummary(db),
    ]);
    setProducts(list);
    setSummary(sum);
    setLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: products.length };
    for (const cat of CATEGORIES) c[cat] = products.filter((p) => p.category === cat).length;
    return c;
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (catFilter !== "all" && p.category !== catFilter) return false;
      if (lowOnly && stateOf(p) === "in-stock") return false;
      if (q && !(p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [products, query, catFilter, lowOnly]);

  const activeCount = useMemo(() => products.filter((p) => p.active).length, [products]);
  const subtitle = `${activeCount} active · ${summary.outOfStock} out of stock`;

  const searchBar = (
    <View style={[styles.search, isTablet ? styles.searchTablet : styles.searchPhone]}>
      <Ionicons name="search" size={15} color={tokens.color.inkFaint} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search name or SKU"
        placeholderTextColor={tokens.color.inkFaint}
        style={styles.searchInput}
        autoCorrect={false}
      />
    </View>
  );

  const overview = isTablet ? (
    <View style={styles.overviewRow}>
      <OverviewCard tone="accent" label="Units on hand" value={String(summary.totalUnits)} foot={`Across ${activeCount} active products`} />
      <OverviewCard tone="plain" label="Stock value" value={formatCurrency(summary.stockValue)} foot="At cost price" />
      <OverviewCard tone="warn" label="Low stock" value={String(summary.lowStock)} foot="At or below reorder point" />
      <OverviewCard tone="danger" label="Out of stock" value={String(summary.outOfStock)} foot="Need restocking" />
    </View>
  ) : null;

  const filters = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
      <Chip label={`All · ${counts.all}`} active={catFilter === "all"} onPress={() => setCatFilter("all")} />
      {CATEGORIES.map((cat) => (
        <Chip
          key={cat}
          label={`${isTablet ? CATEGORY_META[cat].label : CATEGORY_META[cat].short} · ${counts[cat] ?? 0}`}
          active={catFilter === cat}
          onPress={() => setCatFilter(catFilter === cat ? "all" : cat)}
        />
      ))}
      <Chip label={isTablet ? "Low stock only" : "Low only"} active={lowOnly} tone="warn" onPress={() => setLowOnly((v) => !v)} />
    </ScrollView>
  );

  const list = (
    <View style={styles.listCard}>
      {isTablet && (
        <View style={[styles.rowGrid, styles.tableHead]}>
          <Text style={[styles.headCell, styles.colProduct]}>Product</Text>
          <Text style={[styles.headCell, styles.colSku]}>SKU</Text>
          <Text style={[styles.headCell, styles.colCat]}>Category</Text>
          <Text style={[styles.headCell, styles.colNum]}>Price</Text>
          <Text style={[styles.headCell, styles.colNum]}>Cost</Text>
          <Text style={[styles.headCell, styles.colNum]}>On hand</Text>
          <Text style={[styles.headCell, styles.colStatus]}>Status</Text>
        </View>
      )}

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="cube-outline" size={38} color={tokens.color.inkSubtle} />
          <Text style={styles.emptyText}>{loading ? "Loading products…" : "No products found"}</Text>
        </View>
      ) : isTablet ? (
        filtered.map((p, i) => <ProductTableRow key={p.id} product={p} last={i === filtered.length - 1} />)
      ) : (
        filtered.map((p, i) => <ProductPhoneRow key={p.id} product={p} last={i === filtered.length - 1} />)
      )}
    </View>
  );

  if (!isReady) {
    return (
      <ScreenScaffold title="Products" subtitle={subtitle}>
        <View style={styles.center}>
          <Text style={styles.muted}>Opening database…</Text>
        </View>
      </ScreenScaffold>
    );
  }

  if (isTablet) {
    return (
      <ScreenScaffold title="Products" subtitle={subtitle} headerRight={<AddButton onPress={() => {}} />}>
        <View style={{ flex: 1, gap: 12, minHeight: 0 }}>
          {searchBar}
          {overview}
          {filters}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {list}
          </ScrollView>
        </View>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title="Products" subtitle={subtitle}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16 }}>{searchBar}</View>
        <View style={{ marginTop: 12 }}>{filters}</View>
        <ScrollView
          style={{ flex: 1, marginTop: 12 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {list}
        </ScrollView>
        <PressableScale onPress={() => {}} style={[styles.fab, { bottom: 20 + insets.bottom }]}>
          <Ionicons name="add" size={28} color={tokens.color.accentForeground} />
        </PressableScale>
      </View>
    </ScreenScaffold>
  );
}

/* -------------------------------- Sub-parts ------------------------------- */

function AddButton({ onPress }: { onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={styles.addBtn}>
      <Ionicons name="add" size={18} color={tokens.color.accentForeground} />
      <Text style={styles.addBtnText}>Add product</Text>
    </PressableScale>
  );
}

function OverviewCard({ tone, label, value, foot }: { tone: "accent" | "plain" | "warn" | "danger"; label: string; value: string; foot: string }) {
  const accent = tone === "accent";
  const toneStyle =
    tone === "accent" ? styles.ovAccent : tone === "warn" ? styles.ovWarn : tone === "danger" ? styles.ovDanger : styles.ovPlain;
  const labelColor = accent ? "rgba(255,255,255,0.78)" : tone === "warn" ? tokens.color.warning : tone === "danger" ? tokens.color.danger : tokens.color.inkSoft;
  const valueColor = accent ? "#fff" : tone === "warn" ? tokens.color.warning : tone === "danger" ? tokens.color.danger : tokens.color.ink;
  const footColor = accent ? "rgba(255,255,255,0.72)" : tokens.color.inkFaint;
  return (
    <View style={[styles.ovCard, toneStyle]}>
      <Text style={[styles.ovLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.ovValue, { color: valueColor }]}>{value}</Text>
      <Text style={[styles.ovFoot, { color: footColor }]}>{foot}</Text>
    </View>
  );
}

function Chip({ label, active, tone, onPress }: { label: string; active: boolean; tone?: "warn"; onPress: () => void }) {
  const activeStyle = tone === "warn" ? styles.chipWarnActive : styles.chipActive;
  const idleStyle = tone === "warn" ? styles.chipWarnIdle : styles.chipIdle;
  const activeText = tone === "warn" ? tokens.color.warning : tokens.color.accentForeground;
  return (
    <PressableScale onPress={onPress} style={[styles.chip, active ? activeStyle : idleStyle]}>
      <Text style={[styles.chipText, active && { color: activeText }]}>{label}</Text>
    </PressableScale>
  );
}

function Thumb({ category, size }: { category: Category; size: number }) {
  return (
    <View style={[styles.thumb, { width: size, height: size }]}>
      <Ionicons name={CATEGORY_META[category].icon as never} size={size * 0.5} color={tokens.color.inkSubtle} />
    </View>
  );
}

function StatusBadge({ state }: { state: StockState }) {
  const b = stateBadge(state);
  return (
    <View style={[styles.statusBadge, { backgroundColor: b.bg }]}>
      <Text style={[styles.statusText, { color: b.fg }]}>{b.label}</Text>
    </View>
  );
}

function ProductTableRow({ product, last }: { product: Product; last: boolean }) {
  const state = stateOf(product);
  return (
    <View style={[styles.rowGrid, styles.tableRow, state === "low" && { backgroundColor: LOW_ROW_TINT }, last && { borderBottomWidth: 0 }]}>
      <View style={[styles.colProduct, styles.productCell]}>
        <Thumb category={product.category} size={34} />
        <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
      </View>
      <Text style={[styles.cellMono, styles.colSku]}>{product.sku}</Text>
      <Text style={[styles.cell, styles.colCat]}>{CATEGORY_META[product.category].label}</Text>
      <Text style={[styles.cellPrice, styles.colNum]}>{formatCurrency(product.price)}</Text>
      <Text style={[styles.cellCost, styles.colNum]}>{formatCurrency(product.cost)}</Text>
      <Text style={[styles.cellOnHand, styles.colNum]}>{product.stock}</Text>
      <View style={[styles.colStatus, { alignItems: "flex-end" }]}>
        <StatusBadge state={state} />
      </View>
    </View>
  );
}

function ProductPhoneRow({ product, last }: { product: Product; last: boolean }) {
  const state = stateOf(product);
  return (
    <View style={[styles.phoneRow, state === "low" && { backgroundColor: LOW_ROW_TINT }, last && { borderBottomWidth: 0 }]}>
      <Thumb category={product.category} size={40} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.phoneSub}>{product.sku} · {product.stock} on hand</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text style={styles.cellPrice}>{formatCurrency(product.price)}</Text>
        <StatusBadge state={state} />
      </View>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { fontFamily: tokens.font.sans, color: tokens.color.inkMuted },

  /* Header add button */
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 11,
    backgroundColor: tokens.color.accentBrand,
  },
  addBtnText: { fontFamily: tokens.font.sansBold, fontSize: 13.5, color: tokens.color.accentForeground },

  /* Search */
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: tokens.color.surface,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  searchTablet: { height: 44, borderRadius: 12, paddingHorizontal: 14 },
  searchPhone: { height: 46, borderRadius: 13, paddingHorizontal: 14, ...CARD_SHADOW },
  searchInput: { flex: 1, fontFamily: tokens.font.sans, fontSize: 14, color: tokens.color.ink, padding: 0 },

  /* Overview cards (tablet) */
  overviewRow: { flexDirection: "row", gap: 12 },
  ovCard: { flex: 1, borderRadius: 18, padding: 16, ...CARD_SHADOW },
  ovAccent: { backgroundColor: "#2F6BE0" },
  ovPlain: { backgroundColor: tokens.color.surface, borderWidth: 1, borderColor: tokens.color.border },
  ovWarn: { backgroundColor: tokens.color.warningBg, borderWidth: 1, borderColor: "#F6E2C0", shadowOpacity: 0 },
  ovDanger: { backgroundColor: tokens.color.dangerBg, borderWidth: 1, borderColor: "#F6D5CF", shadowOpacity: 0 },
  ovLabel: { fontFamily: tokens.font.sansMedium, fontSize: 13 },
  ovValue: { marginTop: 8, fontFamily: tokens.font.displayBlack, fontSize: 33, letterSpacing: -1.1 },
  ovFoot: { marginTop: 2, fontFamily: tokens.font.sans, fontSize: 11.5 },

  /* Filters */
  filterRow: { gap: 8, paddingHorizontal: 0, paddingRight: 8 },
  chip: { height: 40, paddingHorizontal: 16, borderRadius: 11, justifyContent: "center", borderWidth: 1 },
  chipIdle: { backgroundColor: tokens.color.surface, borderColor: tokens.color.borderMuted },
  chipActive: { backgroundColor: tokens.color.accentBrand, borderColor: tokens.color.accentBrand },
  chipWarnIdle: { backgroundColor: tokens.color.warningBg, borderColor: "#F1DFBE" },
  chipWarnActive: { backgroundColor: "#FCEBCF", borderColor: tokens.color.warning },
  chipText: { fontFamily: tokens.font.sansSemiBold, fontSize: 12.5, color: tokens.color.ink },

  /* List card + rows */
  listCard: {
    backgroundColor: tokens.color.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tokens.color.border,
    overflow: "hidden",
    ...CARD_SHADOW,
  },
  rowGrid: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 22 },
  tableHead: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: tokens.color.borderMuted },
  headCell: { fontFamily: tokens.font.sansMedium, fontSize: 12.5, color: tokens.color.inkMuted },
  tableRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tokens.color.surfaceMuted },
  colProduct: { flex: 1, minWidth: 150 },
  colSku: { width: 130 },
  colCat: { width: 120 },
  colNum: { width: 84, textAlign: "right" },
  colStatus: { width: 84 },
  productCell: { flexDirection: "row", alignItems: "center", gap: 11 },
  productName: { flex: 1, fontFamily: tokens.font.sansSemiBold, fontSize: 13.5, color: tokens.color.ink },
  cell: { fontFamily: tokens.font.sans, fontSize: 12.5, color: tokens.color.inkSoft },
  cellMono: { fontFamily: tokens.font.mono, fontSize: 12, color: tokens.color.inkSoft },
  cellPrice: { fontFamily: tokens.font.sansBold, fontSize: 13.5, color: tokens.color.ink, textAlign: "right" },
  cellCost: { fontFamily: tokens.font.sans, fontSize: 13, color: tokens.color.inkSoft, textAlign: "right" },
  cellOnHand: { fontFamily: tokens.font.sansSemiBold, fontSize: 13.5, color: tokens.color.ink, textAlign: "right" },

  thumb: { borderRadius: 9, backgroundColor: tokens.color.surfaceMuted, alignItems: "center", justifyContent: "center" },

  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7 },
  statusText: { fontFamily: tokens.font.sansSemiBold, fontSize: 11 },

  /* Phone rows */
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.surfaceMuted,
  },
  phoneSub: { marginTop: 2, fontFamily: tokens.font.sans, fontSize: 11.5, color: tokens.color.inkMuted },

  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 56, gap: 6 },
  emptyText: { fontFamily: tokens.font.sansSemiBold, fontSize: 14, color: tokens.color.inkSoft, marginTop: 4 },

  /* FAB (phone) */
  fab: {
    position: "absolute",
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: tokens.color.accentBrand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: tokens.color.accentBrand,
    shadowOpacity: 0.4,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
