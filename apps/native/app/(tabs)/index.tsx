import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenScaffold } from "@/components/nav/screen-scaffold";
import { CartCheckoutPanel } from "@/components/pos/cart-checkout-panel";
import { PressableScale } from "@/components/pos/pressable-scale";
import { ProductCard } from "@/components/pos/product-card";
import { useCart } from "@/contexts/cart-context";
import { useDatabase } from "@/contexts/database-context";
import { productQueries } from "@/lib/db/database";
import { CATEGORIES, CATEGORY_META, formatCurrency } from "@/lib/format";
import { useIsTablet } from "@/lib/responsive";
import { tokens } from "@/lib/theme";
import type { Category, Product } from "@/lib/types";

export default function PointOfSale() {
  const isTablet = useIsTablet();
  const router = useRouter();
  const { db, isReady } = useDatabase();
  const { add, lines, itemCount, subtotal } = useCart();

  const [all, setAll] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    const data = query.trim()
      ? await productQueries.search(db, query.trim())
      : await productQueries.listActive(db);
    setAll(data);
    setLoading(false);
  }, [db, query]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: all.length };
    for (const cat of CATEGORIES) c[cat] = all.filter((p) => p.category === cat).length;
    return c;
  }, [all]);

  const products = useMemo(
    () => (category ? all.filter((p) => p.category === category) : all),
    [all, category],
  );

  const qtyMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const l of lines) m.set(l.productId, l.quantity);
    return m;
  }, [lines]);

  const onAdd = useCallback(
    (p: Product) => {
      if (p.stock <= 0) return;
      add({ productId: p.id, name: p.name, price: p.price, stock: p.stock, category: p.category });
    },
    [add],
  );

  const numColumns = isTablet ? 4 : 2;
  const gap = isTablet ? 12 : 10;

  const grid = (
    <FlatList
      key={numColumns}
      data={products}
      keyExtractor={(item) => String(item.id)}
      numColumns={numColumns}
      showsVerticalScrollIndicator={false}
      columnWrapperStyle={{ gap }}
      contentContainerStyle={{
        gap,
        paddingBottom: isTablet ? 4 : 132,
        paddingHorizontal: isTablet ? 0 : 16,
      }}
      ListEmptyComponent={
        loading ? null : (
          <View style={styles.gridEmpty}>
            <Ionicons name="cube-outline" size={40} color={tokens.color.inkSubtle} />
            <Text style={styles.gridEmptyText}>No products found</Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <ProductCard product={item} qtyInCart={qtyMap.get(item.id) ?? 0} onPress={() => onAdd(item)} />
      )}
    />
  );

  const searchBar = (
    <View style={[styles.search, isTablet ? styles.searchTablet : styles.searchPhone]}>
      <Ionicons name="search" size={isTablet ? 17 : 15} color={tokens.color.inkFaint} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={isTablet ? "Search by product name or SKU" : "Search name or SKU"}
        placeholderTextColor={tokens.color.inkFaint}
        style={styles.searchInput}
        autoCorrect={false}
      />
      {isTablet && (
        <View style={styles.countChip}>
          <Text style={styles.countChipText}>{all.length} items</Text>
        </View>
      )}
    </View>
  );

  const filters = isTablet ? (
    <View style={styles.filterRow}>
      <FilterCard label="All Items" count={counts.all} active={category === null} onPress={() => setCategory(null)} />
      {CATEGORIES.map((cat) => (
        <FilterCard
          key={cat}
          label={CATEGORY_META[cat].label}
          count={counts[cat] ?? 0}
          active={category === cat}
          onPress={() => setCategory(category === cat ? null : cat)}
        />
      ))}
    </View>
  ) : (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      <FilterChip label={`All · ${counts.all}`} active={category === null} onPress={() => setCategory(null)} />
      {CATEGORIES.map((cat) => (
        <FilterChip
          key={cat}
          label={`${CATEGORY_META[cat].short} · ${counts[cat] ?? 0}`}
          active={category === cat}
          onPress={() => setCategory(category === cat ? null : cat)}
        />
      ))}
    </ScrollView>
  );

  if (!isReady) {
    return (
      <ScreenScaffold title="Point of Sale">
        <View style={styles.center}>
          <Text style={styles.muted}>Opening database…</Text>
        </View>
      </ScreenScaffold>
    );
  }

  if (isTablet) {
    return (
      <ScreenScaffold title="Point of Sale">
        <View style={styles.tabletBody}>
          <View style={styles.tabletLeft}>
            {searchBar}
            {filters}
            <View style={{ flex: 1, minHeight: 0 }}>{grid}</View>
          </View>
          <View style={styles.tabletCartPane}>
            <CartCheckoutPanel />
          </View>
        </View>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold
      title="Point of Sale"
      headerRight={<CartButton count={itemCount} onPress={() => router.push("/checkout")} />}
    >
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16 }}>{searchBar}</View>
        <View style={{ marginTop: 12 }}>{filters}</View>
        <View style={{ flex: 1, minHeight: 0, marginTop: 12 }}>{grid}</View>

        {itemCount > 0 && (
          <CartBar count={itemCount} subtotal={subtotal} onPress={() => router.push("/checkout")} />
        )}
      </View>
    </ScreenScaffold>
  );
}

/* -------------------------------- Sub-parts ------------------------------- */

function FilterCard({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={[styles.filterCard, active ? styles.filterCardActive : styles.filterCardIdle]}>
      <Text style={[styles.filterCardLabel, active && { color: tokens.color.accentForeground }]}>{label}</Text>
      <Text style={[styles.filterCardCount, active && { color: "rgba(255,255,255,0.75)" }]}>{count} items</Text>
    </PressableScale>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}>
      <Text style={[styles.chipLabel, active && { color: tokens.color.accentForeground }]}>{label}</Text>
    </PressableScale>
  );
}

function CartButton({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.cartBtn}>
      <Ionicons name="cart-outline" size={20} color={tokens.color.inkStrong} />
      {count > 0 && (
        <View style={styles.cartBtnBadge}>
          <Text style={styles.cartBtnBadgeText}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

function CartBar({ count, subtotal, onPress }: { count: number; subtotal: number; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.cartBar, { paddingBottom: 14 + insets.bottom }]}>
      <View style={styles.cartBarRow}>
        <Text style={styles.cartBarCount}>{count} items in cart</Text>
        <Text style={styles.cartBarTotal}>{formatCurrency(subtotal)}</Text>
      </View>
      <PressableScale onPress={onPress} style={styles.cartBarBtn}>
        <Ionicons name="cart" size={18} color={tokens.color.accentForeground} />
        <Text style={styles.cartBarBtnText}>View Cart</Text>
      </PressableScale>
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

  tabletBody: { flex: 1, flexDirection: "row", gap: 12, minHeight: 0 },
  tabletLeft: { flex: 1, gap: 12, minWidth: 0 },
  tabletCartPane: {
    width: 386,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: tokens.color.surface,
    borderWidth: 1,
    borderColor: tokens.color.border,
    ...CARD_SHADOW,
  },

  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: tokens.color.surface,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  searchTablet: { height: 50, borderRadius: 14, paddingHorizontal: 16, ...CARD_SHADOW },
  searchPhone: { height: 46, borderRadius: 13, paddingHorizontal: 14 },
  searchInput: {
    flex: 1,
    fontFamily: tokens.font.sans,
    fontSize: 14,
    color: tokens.color.ink,
    padding: 0,
  },
  countChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: tokens.color.borderMuted,
  },
  countChipText: { fontFamily: tokens.font.mono, fontSize: 11, color: tokens.color.inkFaint },

  filterRow: { flexDirection: "row", gap: 10 },
  filterCard: {
    gap: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterCardIdle: { backgroundColor: tokens.color.surface, borderColor: tokens.color.borderMuted },
  filterCardActive: { backgroundColor: tokens.color.accentBrand, borderColor: tokens.color.accentBrand },
  filterCardLabel: { fontFamily: tokens.font.sansSemiBold, fontSize: 13, color: tokens.color.ink },
  filterCardCount: { fontFamily: tokens.font.sans, fontSize: 11, color: tokens.color.inkSoft },

  chipRow: { gap: 8, paddingHorizontal: 16 },
  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1 },
  chipIdle: { backgroundColor: tokens.color.surface, borderColor: tokens.color.borderMuted },
  chipActive: { backgroundColor: tokens.color.accentBrand, borderColor: tokens.color.accentBrand },
  chipLabel: { fontFamily: tokens.font.sansSemiBold, fontSize: 12.5, color: tokens.color.ink },

  gridEmpty: { alignItems: "center", justifyContent: "center", paddingVertical: 64, gap: 10, width: "100%" },
  gridEmptyText: { fontFamily: tokens.font.sans, color: tokens.color.inkMuted },

  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: tokens.color.surface,
    borderWidth: 1,
    borderColor: tokens.color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBtnBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 7,
    backgroundColor: tokens.color.accentBrand,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBtnBadgeText: { fontFamily: tokens.font.sansBold, fontSize: 10.5, color: tokens.color.accentForeground },

  cartBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: tokens.color.surface,
    borderTopWidth: 1,
    borderTopColor: tokens.color.borderMuted,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  cartBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cartBarCount: { fontFamily: tokens.font.sans, fontSize: 12.5, color: tokens.color.inkSoft },
  cartBarTotal: { fontFamily: tokens.font.displayBlack, fontSize: 18, color: tokens.color.ink, letterSpacing: -0.4 },
  cartBarBtn: {
    height: 50,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: tokens.color.accentBrand,
    shadowColor: tokens.color.accentBrand,
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cartBarBtnText: { fontFamily: tokens.font.sansBold, fontSize: 15, color: tokens.color.accentForeground },
});
