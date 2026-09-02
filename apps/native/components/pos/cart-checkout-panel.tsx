import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useCart } from "@/contexts/cart-context";
import { useDatabase } from "@/contexts/database-context";
import { CATEGORY_META, PAYMENT_METHODS, formatCurrency } from "@/lib/format";
import { checkout } from "@/lib/pos";
import { computeChange, computeTotals } from "@/lib/pricing";
import { tokens } from "@/lib/theme";
import type { CartLine, PaymentMethod } from "@/lib/types";
import { PressableScale } from "./pressable-scale";

type Props = {
  /** Larger sizing for the phone cart sheet / full Checkout screen. */
  large?: boolean;
  /** Show the "Current Sale" header with the Clear action. */
  showHeader?: boolean;
  onCharged?: (saleId: number) => void;
};

/** Draft reference shown while a sale is in progress, e.g. DRAFT-2026-0914. */
function draftRef(): string {
  const d = new Date();
  const mmdd = `${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `DRAFT-${d.getFullYear()}-${mmdd}`;
}

export function CartCheckoutPanel({ large = false, showHeader = true, onCharged }: Props) {
  const { db } = useDatabase();
  const { lines, subtotal, setQuantity, clear, itemCount } = useCart();

  const [discountText, setDiscountText] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [tender, setTender] = useState<number | null>(null);
  const [charging, setCharging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rawDiscount = parseFloat(discountText) || 0;
  const { discount, total } = computeTotals(lines, rawDiscount);
  const change = method === "cash" && tender != null ? computeChange(total, tender) : 0;
  const isEmpty = lines.length === 0;

  const presets = useMemo(() => {
    const out = new Set<number>();
    for (const step of [10, 20, 50]) out.add(Math.ceil(total / step) * step);
    return [...out].filter((v) => v > total).sort((a, b) => a - b).slice(0, 2);
  }, [total]);

  const onCharge = async () => {
    if (!db || isEmpty || charging) return;
    setCharging(true);
    setError(null);
    const res = await checkout(db, { lines, discount, paymentMethod: method });
    setCharging(false);
    if (res.ok && res.saleId != null) {
      clear();
      setDiscountText("");
      setTender(null);
      setMethod("cash");
      onCharged?.(res.saleId);
    } else {
      setError(res.error ?? "Could not complete the sale");
    }
  };

  return (
    <View style={styles.root}>
      {showHeader && (
        <View style={styles.header}>
          <View style={{ gap: 2 }}>
            <View style={styles.titleRow}>
              <View style={styles.titleBar} />
              <Text style={[styles.title, large && { fontSize: 18 }]}>Current Sale</Text>
            </View>
            <Text style={styles.draft}>{draftRef()}</Text>
          </View>
          {!isEmpty && (
            <PressableScale onPress={clear} style={styles.clearBtn}>
              <Text style={styles.clearText}>Clear</Text>
            </PressableScale>
          )}
        </View>
      )}

      <ScrollView style={styles.lines} contentContainerStyle={styles.linesContent} showsVerticalScrollIndicator={false}>
        {isEmpty ? (
          <View style={styles.empty}>
            <Ionicons name="cart-outline" size={34} color={tokens.color.inkSubtle} />
            <Text style={styles.emptyText}>No items yet</Text>
            <Text style={styles.emptySub}>Tap a product to add it to the sale</Text>
          </View>
        ) : (
          lines.map((line) => (
            <CartRow key={line.productId} line={line} large={large} onSetQty={setQuantity} />
          ))
        )}
      </ScrollView>

      <View style={[styles.footer, { padding: large ? 20 : 16 }]}>
        <View style={{ gap: large ? 8 : 7 }}>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Subtotal</Text>
            <Text style={styles.sumValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Discount</Text>
            <View style={styles.discountWrap}>
              <Text style={styles.discountMinus}>− $</Text>
              <TextInput
                value={discountText}
                onChangeText={setDiscountText}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={tokens.color.inkSubtle}
                style={styles.discountInput}
              />
            </View>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={[styles.totalValue, { fontSize: large ? 32 : 24 }]}>{formatCurrency(total)}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Payment method</Text>
        <View style={styles.methodGrid}>
          {PAYMENT_METHODS.map((pm) => {
            const active = method === pm.value;
            return (
              <PressableScale
                key={pm.value}
                onPress={() => setMethod(pm.value)}
                style={[styles.method, active ? styles.methodActive : styles.methodIdle]}
              >
                <Text style={[styles.methodLabel, active && { color: tokens.color.brandDark }]}>{pm.label}</Text>
                <Text style={[styles.methodSub, active && { color: tokens.color.accentBrand }]}>{pm.sub}</Text>
              </PressableScale>
            );
          })}
        </View>

        {method === "cash" && !isEmpty && (
          <View style={styles.tenderRow}>
            <PressableScale
              onPress={() => setTender(total)}
              style={[styles.tenderChip, tender === total && styles.tenderChipActive]}
            >
              <Text style={[styles.tenderText, tender === total && { color: tokens.color.accentForeground }]}>Exact</Text>
            </PressableScale>
            {presets.map((amt) => (
              <PressableScale
                key={amt}
                onPress={() => setTender(amt)}
                style={[styles.tenderChip, tender === amt && styles.tenderChipActive]}
              >
                <Text style={[styles.tenderText, tender === amt && { color: tokens.color.accentForeground }]}>
                  {formatCurrency(amt)}
                </Text>
              </PressableScale>
            ))}
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={styles.changeLabel}>
                Change <Text style={styles.changeValue}>{formatCurrency(change)}</Text>
              </Text>
            </View>
          </View>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}

        <PressableScale
          onPress={onCharge}
          disabled={isEmpty || charging}
          style={[styles.charge, { height: large ? 54 : 52 }, (isEmpty || charging) && { opacity: 0.5 }]}
        >
          <Text style={styles.chargeLabel}>{charging ? "Charging…" : "Charge"}</Text>
          <Text style={styles.chargeAmount}>{formatCurrency(total)}</Text>
        </PressableScale>
      </View>
    </View>
  );
}

function CartRow({
  line,
  large,
  onSetQty,
}: {
  line: CartLine;
  large: boolean;
  onSetQty: (productId: number, quantity: number) => void;
}) {
  const meta = CATEGORY_META[line.category];
  const thumb = large ? 44 : 40;
  const step = large ? 30 : 26;

  return (
    <View style={styles.row}>
      <View style={[styles.rowThumb, { width: thumb, height: thumb }]}>
        <Ionicons name={meta.icon as never} size={large ? 20 : 18} color={tokens.color.inkSubtle} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={styles.rowName} numberOfLines={1}>{line.name}</Text>
        <Text style={styles.rowEach}>{formatCurrency(line.price)} each</Text>
      </View>
      <View style={styles.stepper}>
        <PressableScale
          onPress={() => onSetQty(line.productId, line.quantity - 1)}
          style={[styles.stepBtn, { width: step, height: step }]}
        >
          <Text style={styles.stepGlyph}>−</Text>
        </PressableScale>
        <Text style={styles.stepQty}>{line.quantity}</Text>
        <PressableScale
          onPress={() => onSetQty(line.productId, line.quantity + 1)}
          style={[styles.stepBtn, { width: step, height: step }]}
        >
          <Text style={styles.stepGlyph}>+</Text>
        </PressableScale>
      </View>
      <Text style={[styles.rowTotal, { width: large ? 60 : 58 }]}>
        {formatCurrency(line.price * line.quantity)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: tokens.color.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titleBar: {
    width: 3,
    height: 15,
    borderRadius: 2,
    backgroundColor: tokens.color.accentBrand,
  },
  title: {
    fontFamily: tokens.font.display,
    fontSize: 17,
    color: tokens.color.ink,
    letterSpacing: -0.3,
  },
  draft: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    color: tokens.color.inkFaint,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: tokens.color.dangerBg,
  },
  clearText: {
    fontFamily: tokens.font.sansSemiBold,
    fontSize: 12,
    color: tokens.color.danger,
  },
  lines: {
    flex: 1,
    minHeight: 0,
  },
  linesContent: {
    paddingHorizontal: 18,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 6,
  },
  emptyText: {
    fontFamily: tokens.font.sansSemiBold,
    fontSize: 14,
    color: tokens.color.inkSoft,
    marginTop: 4,
  },
  emptySub: {
    fontFamily: tokens.font.sans,
    fontSize: 12,
    color: tokens.color.inkFaint,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: tokens.color.surfaceSunken,
  },
  rowThumb: {
    borderRadius: 9,
    backgroundColor: tokens.color.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  rowName: {
    fontFamily: tokens.font.sansSemiBold,
    fontSize: 13,
    color: tokens.color.ink,
  },
  rowEach: {
    fontFamily: tokens.font.sans,
    fontSize: 11.5,
    color: tokens.color.inkFaint,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    padding: 3,
    borderRadius: 9,
    backgroundColor: tokens.color.surfaceMuted,
  },
  stepBtn: {
    borderRadius: 7,
    backgroundColor: tokens.color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stepGlyph: {
    fontFamily: tokens.font.sansSemiBold,
    fontSize: 16,
    lineHeight: 18,
    color: tokens.color.inkStrong,
  },
  stepQty: {
    width: 26,
    textAlign: "center",
    fontFamily: tokens.font.sansBold,
    fontSize: 13,
    color: tokens.color.ink,
  },
  rowTotal: {
    textAlign: "right",
    fontFamily: tokens.font.sansBold,
    fontSize: 13.5,
    color: tokens.color.ink,
  },
  footer: {
    backgroundColor: tokens.color.panel,
    borderTopWidth: 1,
    borderTopColor: tokens.color.borderMuted,
  },
  sumRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sumLabel: {
    fontFamily: tokens.font.sans,
    fontSize: 12.5,
    color: tokens.color.inkSoft,
  },
  sumValue: {
    fontFamily: tokens.font.sansMedium,
    fontSize: 12.5,
    color: tokens.color.ink,
  },
  discountWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  discountMinus: {
    fontFamily: tokens.font.sans,
    fontSize: 12,
    color: tokens.color.inkFaint,
  },
  discountInput: {
    width: 58,
    textAlign: "right",
    borderWidth: 1,
    borderColor: tokens.color.borderMuted,
    backgroundColor: tokens.color.surface,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontFamily: tokens.font.sansSemiBold,
    fontSize: 12.5,
    color: tokens.color.ink,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingTop: 9,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: tokens.color.borderMuted,
  },
  totalLabel: {
    fontFamily: tokens.font.sansBold,
    fontSize: 14,
    color: tokens.color.ink,
  },
  totalValue: {
    fontFamily: tokens.font.displayBlack,
    color: tokens.color.ink,
    letterSpacing: -0.6,
  },
  sectionLabel: {
    marginTop: 14,
    marginBottom: 8,
    fontFamily: tokens.font.sansMedium,
    fontSize: 12.5,
    color: tokens.color.inkMuted,
  },
  methodGrid: {
    flexDirection: "row",
    gap: 7,
  },
  method: {
    flex: 1,
    alignItems: "center",
    gap: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  methodIdle: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.borderMuted,
  },
  methodActive: {
    backgroundColor: "#E9F0FC",
    borderColor: tokens.color.accentBrand,
  },
  methodLabel: {
    fontFamily: tokens.font.sansSemiBold,
    fontSize: 12.5,
    color: tokens.color.ink,
  },
  methodSub: {
    fontFamily: tokens.font.sans,
    fontSize: 10,
    color: tokens.color.inkSoft,
  },
  tenderRow: {
    marginTop: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tenderChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: tokens.color.borderMuted,
    backgroundColor: tokens.color.surface,
  },
  tenderChipActive: {
    backgroundColor: tokens.color.accentBrand,
    borderColor: tokens.color.accentBrand,
  },
  tenderText: {
    fontFamily: tokens.font.sansSemiBold,
    fontSize: 11.5,
    color: tokens.color.ink,
  },
  changeLabel: {
    fontFamily: tokens.font.sans,
    fontSize: 11.5,
    color: tokens.color.inkSoft,
  },
  changeValue: {
    fontFamily: tokens.font.sansBold,
    fontSize: 14,
    color: tokens.color.ink,
  },
  error: {
    marginTop: 10,
    fontFamily: tokens.font.sansMedium,
    fontSize: 12,
    color: tokens.color.danger,
  },
  charge: {
    marginTop: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    backgroundColor: tokens.color.accentBrand,
    shadowColor: tokens.color.accentBrand,
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  chargeLabel: {
    fontFamily: tokens.font.sansBold,
    fontSize: 15.5,
    color: tokens.color.accentForeground,
    letterSpacing: -0.2,
  },
  chargeAmount: {
    fontFamily: tokens.font.sansBold,
    fontSize: 15.5,
    color: tokens.color.accentForeground,
  },
});
