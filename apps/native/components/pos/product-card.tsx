import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CATEGORY_META, formatCurrency } from "@/lib/format";
import { useIsTablet } from "@/lib/responsive";
import { tokens } from "@/lib/theme";
import type { Product } from "@/lib/types";

type Props = {
  product: Product;
  /** Quantity of this product already in the cart (drives the corner badge). */
  qtyInCart?: number;
  onPress: () => void;
};

/** A single tappable product tile in the POS grid. */
export function ProductCard({ product, qtyInCart = 0, onPress }: Props) {
  const isTablet = useIsTablet();
  const meta = CATEGORY_META[product.category];
  const out = product.stock <= 0;
  const low = !out && product.stock <= product.lowStockThreshold;
  const inCart = qtyInCart > 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={out}
      style={[
        styles.card,
        { padding: isTablet ? 11 : 10 },
        inCart ? styles.cardActive : styles.cardIdle,
        out && styles.cardOut,
      ]}
    >
      <View style={[styles.thumb, { height: isTablet ? 92 : 84 }]}>
        <Ionicons name={meta.icon as never} size={30} color={tokens.color.inkSubtle} />
        {inCart && (
          <View style={styles.qtyBadge}>
            <Text style={styles.qtyBadgeText}>{qtyInCart}</Text>
          </View>
        )}
        {low && (
          <View style={[styles.statusBadge, styles.lowBadge]}>
            <Text style={[styles.statusText, { color: tokens.color.warning }]}>
              {product.stock} left
            </Text>
          </View>
        )}
        {out && (
          <View style={[styles.statusBadge, styles.outBadge]}>
            <Text style={[styles.statusText, { color: tokens.color.danger }]}>Out</Text>
          </View>
        )}
      </View>

      <View style={{ marginTop: isTablet ? 11 : 9, gap: 3 }}>
        <Text style={[styles.name, { fontSize: isTablet ? 14 : 13 }]} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.sku}>{product.sku}</Text>
      </View>

      <View style={[styles.footer, { marginTop: isTablet ? 11 : 9, paddingTop: isTablet ? 11 : 9 }]}>
        <View style={styles.catChip}>
          <Text style={styles.catChipText}>{isTablet ? meta.label : meta.short}</Text>
        </View>
        <Text style={[styles.price, { fontSize: isTablet ? 16 : 15 }]}>
          {formatCurrency(product.price)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: tokens.color.surface,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardIdle: {
    borderColor: tokens.color.border,
  },
  cardActive: {
    borderColor: tokens.color.accentBrand,
    shadowColor: tokens.color.accentBrand,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardOut: {
    opacity: 0.48,
  },
  thumb: {
    borderRadius: 10,
    backgroundColor: tokens.color.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBadge: {
    position: "absolute",
    top: 7,
    right: 7,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 7,
    backgroundColor: tokens.color.accentBrand,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBadgeText: {
    fontFamily: tokens.font.sansBold,
    fontSize: 11,
    color: tokens.color.accentForeground,
  },
  statusBadge: {
    position: "absolute",
    top: 7,
    left: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lowBadge: {
    backgroundColor: tokens.color.warningBg,
  },
  outBadge: {
    backgroundColor: tokens.color.dangerBg,
  },
  statusText: {
    fontFamily: tokens.font.sansBold,
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  name: {
    fontFamily: tokens.font.sansSemiBold,
    color: tokens.color.ink,
    letterSpacing: -0.1,
  },
  sku: {
    fontFamily: tokens.font.mono,
    fontSize: 10.5,
    color: tokens.color.inkFaint,
  },
  footer: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: tokens.color.surfaceMuted,
  },
  catChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: tokens.color.surfaceMuted,
  },
  catChipText: {
    fontFamily: tokens.font.sansSemiBold,
    fontSize: 10.5,
    color: tokens.color.inkSoft,
  },
  price: {
    fontFamily: tokens.font.sansBold,
    color: tokens.color.ink,
    letterSpacing: -0.3,
  },
});
