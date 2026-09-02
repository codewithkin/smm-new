import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/pos/pressable-scale";
import { useCart } from "@/contexts/cart-context";
import { useDatabase } from "@/contexts/database-context";
import { PAYMENT_METHODS, formatCurrency } from "@/lib/format";
import { checkout } from "@/lib/pos";
import { computeChange, computeTotals } from "@/lib/pricing";
import { useIsTablet } from "@/lib/responsive";
import { tokens } from "@/lib/theme";
import type { PaymentMethod } from "@/lib/types";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "Del"];

function draftRef(): string {
  const d = new Date();
  const mmdd = `${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `DRAFT-${d.getFullYear()}-${mmdd}`;
}

export default function CheckoutScreen() {
  const isTablet = useIsTablet();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { db } = useDatabase();
  const { lines, itemCount, clear } = useCart();

  const [discountText, setDiscountText] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [tender, setTender] = useState("");
  const [charging, setCharging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rawDiscount = parseFloat(discountText) || 0;
  const { subtotal, discount, total } = computeTotals(lines, rawDiscount);
  const tenderNum = parseFloat(tender) || 0;
  const change = method === "cash" ? computeChange(total, tenderNum) : 0;
  const isCash = method === "cash";
  const canConfirm =
    lines.length > 0 && !charging && (!isCash || tenderNum >= total);

  const presets = useMemo(() => {
    const out = new Set<number>();
    for (const step of [10, 20, 50]) out.add(Math.ceil(total / step) * step);
    return [...out].filter((v) => v > total).sort((a, b) => a - b).slice(0, 2);
  }, [total]);

  const onKey = (k: string) => {
    setError(null);
    if (k === "Del") {
      setTender((t) => t.slice(0, -1));
    } else if (k === ".") {
      setTender((t) => (t.includes(".") ? t : (t || "0") + "."));
    } else {
      setTender((t) => {
        const next = t + k;
        // Cap to 2 decimal places.
        const dot = next.indexOf(".");
        if (dot >= 0 && next.length - dot > 3) return t;
        return next;
      });
    }
  };

  const onConfirm = async () => {
    if (!canConfirm || !db) return;
    setCharging(true);
    setError(null);
    const res = await checkout(db, { lines, discount, paymentMethod: method });
    setCharging(false);
    if (res.ok && res.saleId != null) {
      clear();
      router.replace({
        pathname: "/sale/[id]",
        params: { id: String(res.saleId), tendered: isCash ? String(tenderNum) : "" },
      });
    } else {
      setError(res.error ?? "Could not complete the sale");
    }
  };

  const close = () => router.back();

  const header = (
    <View style={styles.header}>
      {!isTablet && (
        <Pressable onPress={close} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={tokens.color.inkStrong} />
        </Pressable>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.title}>Checkout</Text>
        <Text style={styles.draft}>
          {draftRef()} · {itemCount} {itemCount === 1 ? "item" : "items"}
        </Text>
      </View>
      {isTablet && (
        <Pressable onPress={close} hitSlop={10} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={tokens.color.inkStrong} />
        </Pressable>
      )}
    </View>
  );

  const totalsCard = (
    <View style={styles.totalsCard}>
      <View style={styles.sumRow}>
        <Text style={styles.sumLabel}>Subtotal</Text>
        <Text style={styles.sumValue}>{formatCurrency(subtotal)}</Text>
      </View>
      <View style={[styles.sumRow, { marginTop: 9 }]}>
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
      <View style={styles.totalDueRow}>
        <Text style={styles.totalDueLabel}>Total due</Text>
        <Text style={styles.totalDueValue}>{formatCurrency(total)}</Text>
      </View>
    </View>
  );

  const methodGrid = (
    <View>
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
    </View>
  );

  const keypad = (
    <View style={styles.keypad}>
      {KEYS.map((k) => (
        <PressableScale key={k} onPress={() => onKey(k)} style={[styles.key, k === "Del" && styles.keyDel]}>
          <Text style={[styles.keyText, k === "Del" && styles.keyDelText]}>{k}</Text>
        </PressableScale>
      ))}
    </View>
  );

  const quickChips = (
    <View style={styles.chipsRow}>
      <PressableScale onPress={() => setTender(total.toFixed(2))} style={[styles.quickChip, styles.quickIdle]}>
        <Text style={styles.quickText}>Exact</Text>
      </PressableScale>
      {presets.map((amt) => (
        <PressableScale key={amt} onPress={() => setTender(amt.toFixed(2))} style={[styles.quickChip, styles.quickIdle]}>
          <Text style={styles.quickText}>${amt}</Text>
        </PressableScale>
      ))}
    </View>
  );

  const confirmBtn = (
    <PressableScale onPress={onConfirm} disabled={!canConfirm} style={[styles.confirm, !canConfirm && { opacity: 0.5 }]}>
      <Text style={styles.confirmLabel}>{charging ? "Confirming…" : "Confirm sale"}</Text>
      <Text style={styles.confirmAmount}>{formatCurrency(total)}</Text>
    </PressableScale>
  );

  const empty = lines.length === 0;

  /* -------------------------------- Tablet -------------------------------- */
  if (isTablet) {
    return (
      <Pressable style={styles.scrim} onPress={close}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          {header}
          {empty ? (
            <EmptyState onClose={close} />
          ) : (
            <View style={styles.dialogBody}>
              <View style={{ flex: 1, gap: 18 }}>
                {totalsCard}
                {methodGrid}
                {isCash && (
                  <View style={styles.changeCard}>
                    <View>
                      <Text style={styles.changeLabel}>Change due</Text>
                      <Text style={styles.changeValue}>{formatCurrency(change)}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.changeLabel}>Tendered</Text>
                      <Text style={styles.tenderedSmall}>{formatCurrency(tenderNum)}</Text>
                    </View>
                  </View>
                )}
                {!!error && <Text style={styles.error}>{error}</Text>}
                {confirmBtn}
              </View>

              {isCash && (
                <View style={{ width: 320, gap: 10 }}>
                  <Text style={styles.sectionLabel}>Amount tendered</Text>
                  <View style={styles.tenderDisplay}>
                    <Text style={styles.tenderDisplayText}>${tender || "0"}</Text>
                  </View>
                  {keypad}
                  {quickChips}
                </View>
              )}
            </View>
          )}
        </Pressable>
      </Pressable>
    );
  }

  /* --------------------------------- Phone -------------------------------- */
  return (
    <View style={[styles.phoneRoot, { paddingTop: insets.top + 8 }]}>
      <View style={{ paddingHorizontal: 16 }}>{header}</View>

      {empty ? (
        <EmptyState onClose={close} />
      ) : (
        <>
          <View style={{ paddingHorizontal: 16, gap: 14, flex: 1 }}>
            {totalsCard}
            {methodGrid}
            {isCash && (
              <View style={styles.tenderRowPhone}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionLabel}>Tendered</Text>
                  <View style={styles.tenderDisplayPhone}>
                    <Text style={styles.tenderDisplayText}>${tender || "0"}</Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.sectionLabel}>Change</Text>
                  <Text style={styles.changeValue}>{formatCurrency(change)}</Text>
                </View>
              </View>
            )}
            {isCash && <View style={{ flex: 1, justifyContent: "flex-end" }}>{keypad}</View>}
            {!!error && <Text style={styles.error}>{error}</Text>}
          </View>

          <View style={[styles.phoneFooter, { paddingBottom: insets.bottom + 20 }]}>{confirmBtn}</View>
        </>
      )}
    </View>
  );
}

function EmptyState({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="cart-outline" size={40} color={tokens.color.inkSubtle} />
      <Text style={styles.emptyText}>Your cart is empty</Text>
      <PressableScale onPress={onClose} style={styles.emptyBtn}>
        <Text style={styles.emptyBtnText}>Back to sale</Text>
      </PressableScale>
    </View>
  );
}

const ACCENT_TINT = "#E9F0FC";

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(31,37,47,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  dialog: {
    width: 760,
    maxWidth: "100%",
    backgroundColor: tokens.color.surface,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#1B2A44",
    shadowOpacity: 0.35,
    shadowRadius: 80,
    shadowOffset: { width: 0, height: 32 },
    elevation: 24,
  },
  dialogBody: { flexDirection: "row", gap: 26, paddingHorizontal: 26, paddingBottom: 22 },

  phoneRoot: { flex: 1, backgroundColor: tokens.color.app },
  phoneFooter: {
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: tokens.color.surface,
    borderTopWidth: 1,
    borderTopColor: tokens.color.borderMuted,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 26,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: tokens.color.surface, borderWidth: 1, borderColor: tokens.color.border, alignItems: "center", justifyContent: "center" },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: tokens.color.surfaceMuted, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: tokens.font.display, fontSize: 21, color: tokens.color.ink, letterSpacing: -0.5 },
  draft: { marginTop: 3, fontFamily: tokens.font.mono, fontSize: 11.5, color: tokens.color.inkFaint },

  totalsCard: { backgroundColor: tokens.color.panel, borderRadius: 14, padding: 16 },
  sumRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sumLabel: { fontFamily: tokens.font.sans, fontSize: 13, color: tokens.color.inkSoft },
  sumValue: { fontFamily: tokens.font.sansMedium, fontSize: 13, color: tokens.color.ink },
  discountWrap: { flexDirection: "row", alignItems: "center", gap: 5 },
  discountMinus: { fontFamily: tokens.font.sans, fontSize: 12.5, color: tokens.color.inkFaint },
  discountInput: {
    width: 66,
    textAlign: "right",
    borderWidth: 1,
    borderColor: tokens.color.borderMuted,
    backgroundColor: tokens.color.surface,
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontFamily: tokens.font.sansSemiBold,
    fontSize: 13,
    color: tokens.color.ink,
  },
  totalDueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 13,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: tokens.color.borderMuted,
  },
  totalDueLabel: { fontFamily: tokens.font.sansBold, fontSize: 15, color: tokens.color.ink },
  totalDueValue: { fontFamily: tokens.font.displayBlack, fontSize: 34, color: tokens.color.ink, letterSpacing: -1.2 },

  sectionLabel: { fontFamily: tokens.font.sansMedium, fontSize: 12.5, color: tokens.color.inkMuted, marginBottom: 9 },
  methodGrid: { flexDirection: "row", gap: 9 },
  method: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 13, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1.5 },
  methodIdle: { backgroundColor: tokens.color.surface, borderColor: tokens.color.borderMuted },
  methodActive: { backgroundColor: ACCENT_TINT, borderColor: tokens.color.accentBrand },
  methodLabel: { fontFamily: tokens.font.sansBold, fontSize: 14, color: tokens.color.ink },
  methodSub: { fontFamily: tokens.font.sans, fontSize: 11, color: tokens.color.inkSoft },

  changeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderRadius: 14,
    backgroundColor: ACCENT_TINT,
  },
  changeLabel: { fontFamily: tokens.font.sans, fontSize: 12, color: tokens.color.accentBrandDark },
  changeValue: { marginTop: 2, fontFamily: tokens.font.displayBlack, fontSize: 32, color: tokens.color.brandDark, letterSpacing: -1 },
  tenderedSmall: { marginTop: 3, fontFamily: tokens.font.sansBold, fontSize: 17, color: tokens.color.ink },

  tenderRowPhone: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  tenderDisplay: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: tokens.color.accentBrand,
    backgroundColor: tokens.color.surface,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  tenderDisplayPhone: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: tokens.color.accentBrand,
    backgroundColor: tokens.color.surface,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  tenderDisplayText: { fontFamily: tokens.font.displayBlack, fontSize: 26, color: tokens.color.ink, letterSpacing: -0.8 },

  keypad: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  key: {
    width: "31.5%",
    height: 56,
    borderRadius: 12,
    backgroundColor: tokens.color.surface,
    borderWidth: 1,
    borderColor: tokens.color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  keyDel: { backgroundColor: tokens.color.surfaceSunken, borderColor: tokens.color.surfaceSunken },
  keyText: { fontFamily: tokens.font.sansSemiBold, fontSize: 19, color: tokens.color.ink },
  keyDelText: { fontFamily: tokens.font.sansBold, fontSize: 13.5, color: tokens.color.inkSoft },

  chipsRow: { flexDirection: "row", gap: 8 },
  quickChip: { flex: 1, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  quickIdle: { borderWidth: 1, borderColor: tokens.color.borderMuted, backgroundColor: tokens.color.surface },
  quickText: { fontFamily: tokens.font.sansSemiBold, fontSize: 12.5, color: tokens.color.ink },

  confirm: {
    height: 56,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    backgroundColor: tokens.color.accentBrand,
    shadowColor: tokens.color.accentBrand,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  confirmLabel: { fontFamily: tokens.font.sansBold, fontSize: 16, color: tokens.color.accentForeground },
  confirmAmount: { fontFamily: tokens.font.sansBold, fontSize: 16, color: tokens.color.accentForeground },

  error: { fontFamily: tokens.font.sansMedium, fontSize: 12.5, color: tokens.color.danger },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  emptyText: { fontFamily: tokens.font.sansSemiBold, fontSize: 15, color: tokens.color.inkSoft },
  emptyBtn: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, backgroundColor: tokens.color.accentBrand },
  emptyBtnText: { fontFamily: tokens.font.sansBold, fontSize: 14, color: tokens.color.accentForeground },
});
