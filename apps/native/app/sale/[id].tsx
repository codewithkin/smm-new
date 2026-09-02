import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/pos/pressable-scale";
import { useDatabase } from "@/contexts/database-context";
import { saleQueries, settingsQueries } from "@/lib/db/database";
import { formatCurrency, formatDate, paymentLabel, receiptId } from "@/lib/format";
import {
  describePrinterError,
  ensurePrinterPermission,
  findPrinters,
  getPrinterAddress,
  printSaleReceipt,
  resetPrinterAddress,
  type Device,
} from "@/lib/printer";
import { useIsTablet } from "@/lib/responsive";
import { tokens } from "@/lib/theme";
import type { SaleDetail } from "@/lib/types";

const SUCCESS_BG = "#E7F6EC";

export default function ReceiptScreen() {
  const isTablet = useIsTablet();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { db } = useDatabase();
  const params = useLocalSearchParams<{ id: string; tendered?: string }>();
  const saleId = Number(params.id);
  const tendered = params.tendered ? Number(params.tendered) : null;

  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [cashier, setCashier] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [printerOpen, setPrinterOpen] = useState(false);
  const [printers, setPrinters] = useState<Device[]>([]);
  const [printing, setPrinting] = useState(false);
  const [printerNotice, setPrinterNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !Number.isFinite(saleId)) return;
    let active = true;
    Promise.all([saleQueries.getById(db, saleId), settingsQueries.getOperator(db)]).then(
      ([s, op]) => {
        if (!active) return;
        setSale(s);
        setCashier(op?.shortName ?? "");
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [db, saleId]);

  const subtotal = sale ? sale.total + sale.discount : 0;
  const change = tendered != null && sale ? Math.max(0, tendered - sale.total) : null;

  const newSale = () => router.replace("/(tabs)");

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      newSale();
    }
  };

  const backButton = (
    <PressableScale onPress={goBack} style={styles.backButton}>
      <Ionicons name="arrow-back" size={20} color={tokens.color.inkStrong} />
    </PressableScale>
  );

  const receiptText = useCallback(() => {
    if (!sale) return "";
    const lines = sale.lines
      .map((l) => `${l.quantity} x ${l.name}  ${formatCurrency(l.price * l.quantity)}`)
      .join("\n");
    return [
      "Smart Switch Mobile — Till 01",
      receiptId(sale.id, sale.createdAt),
      formatDate(sale.createdAt),
      "",
      lines,
      "",
      `Subtotal ${formatCurrency(subtotal)}`,
      sale.discount > 0 ? `Discount -${formatCurrency(sale.discount)}` : "",
      `Total ${formatCurrency(sale.total)} (${paymentLabel(sale.paymentMethod)})`,
    ]
      .filter(Boolean)
      .join("\n");
  }, [sale, subtotal]);

  const openPrinterPicker = useCallback(async () => {
    setPrinterNotice(null);
    try {
      await ensurePrinterPermission();
      const found = await findPrinters();
      setPrinters(found);
      setPrinterOpen(true);
    } catch (error) {
      setPrinterNotice(describePrinterError(error));
      setPrinterOpen(true);
    }
  }, []);

  const doPrint = useCallback(
    async (address: string) => {
      if (!sale) return;
      setPrinting(true);
      setPrinterNotice(null);
      try {
        await printSaleReceipt(address, sale);
        setPrinterOpen(false);
      } catch (error) {
        setPrinterNotice(describePrinterError(error));
      } finally {
        setPrinting(false);
      }
    },
    [sale],
  );

  const onPrint = useCallback(async () => {
    const remembered = getPrinterAddress();
    if (remembered) {
      await doPrint(remembered);
    } else {
      await openPrinterPicker();
    }
  }, [doPrint, openPrinterPicker]);

  const onPrintSetup = useCallback(() => {
    resetPrinterAddress();
    void openPrinterPicker();
  }, [openPrinterPicker]);

  const onShare = useCallback(async () => {
    const message = receiptText();
    if (message) await Share.share({ message });
  }, [receiptText]);

  const successHeader = (
    <View style={[styles.successBand, isTablet ? styles.successBandTablet : styles.successBandPhone]}>
      <View style={styles.checkCircle}>
        <Ionicons name="checkmark" size={26} color="#fff" />
      </View>
      <Text style={styles.successTitle}>Sale complete</Text>
      <Text style={styles.successSub}>Stock updated and saved on this device</Text>
    </View>
  );

  const body = !sale ? (
    <View style={styles.center}>
      <Text style={styles.muted}>{loading ? "Loading receipt…" : "Receipt not found"}</Text>
    </View>
  ) : (
    <>
      <View style={styles.infoRow}>
        <InfoCol label="Receipt" value={receiptId(sale.id, sale.createdAt)} mono />
        <InfoCol label="Date" value={formatDate(sale.createdAt)} />
        <InfoCol label="Payment" value={paymentLabel(sale.paymentMethod)} align="right" />
      </View>
      {!!cashier && <Text style={styles.cashier}>Served by {cashier}</Text>}

      <View style={styles.lines}>
        {sale.lines.map((l, i) => (
          <View key={i} style={styles.lineRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lineName}>{l.name}</Text>
              <Text style={styles.lineMeta}>
                {l.quantity} × {formatCurrency(l.price)}
              </Text>
            </View>
            <Text style={styles.lineTotal}>{formatCurrency(l.price * l.quantity)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.totals}>
        <TotRow label="Subtotal" value={formatCurrency(subtotal)} />
        {sale.discount > 0 && <TotRow label="Discount" value={`− ${formatCurrency(sale.discount)}`} />}
        {tendered != null && change != null && (
          <TotRow label="Tendered / change" value={`${formatCurrency(tendered)} / ${formatCurrency(change)}`} />
        )}
        <View style={styles.totalPaidRow}>
          <Text style={styles.totalPaidLabel}>Total paid</Text>
          <Text style={styles.totalPaidValue}>{formatCurrency(sale.total)}</Text>
        </View>
      </View>
    </>
  );

  const actions = (
    <View style={styles.actions}>
      <PressableScale onPress={onPrint} style={styles.actionOutline}>
        <Ionicons name="print-outline" size={17} color={tokens.color.inkStrong} />
        <Text style={styles.actionOutlineText}>Print</Text>
      </PressableScale>
      <PressableScale onPress={onShare} style={styles.actionOutline}>
        <Ionicons name="share-outline" size={17} color={tokens.color.inkStrong} />
        <Text style={styles.actionOutlineText}>Share</Text>
      </PressableScale>
      <PressableScale onPress={newSale} style={styles.actionPrimary}>
        <Text style={styles.actionPrimaryText}>New sale</Text>
      </PressableScale>
    </View>
  );

  const printerModal = (
    <Modal
      visible={printerOpen}
      transparent
      animationType="fade"
      onRequestClose={() => !printing && setPrinterOpen(false)}
    >
      <View style={styles.printerScrim} onStartShouldSetResponder={() => true}>
        <View style={styles.printerDialog}>
          <View style={styles.printerHeader}>
            <Ionicons name="print-outline" size={20} color={tokens.color.inkStrong} />
            <Text style={styles.printerTitle}>Print receipt</Text>
          </View>
          <Text style={styles.printerHint}>Pick a Bluetooth thermal printer for this 58mm receipt.</Text>

          {printing ? (
            <View style={styles.printerStatus}>
              <Text style={styles.printerStatusText}>Printing…</Text>
            </View>
          ) : printerNotice ? (
            <View style={styles.printerStatus}>
              <Text style={[styles.printerStatusText, { color: tokens.color.danger }]}>{printerNotice}</Text>
            </View>
          ) : printers.length === 0 ? (
            <View style={styles.printerStatus}>
              <Text style={styles.printerStatusText}>
                No printers found. Pair one in system Bluetooth settings, then use Printer setup below.
              </Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              {printers.map((p) => (
                <Pressable key={p.address} disabled={printing} onPress={() => doPrint(p.address)} style={styles.printerRow}>
                  <Ionicons name="bluetooth-outline" size={18} color={tokens.color.accentBrand} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.printerName} numberOfLines={1}>
                      {p.name || "Bluetooth printer"}
                    </Text>
                    <Text style={styles.printerAddr}>{p.address}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={tokens.color.inkFaint} />
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={styles.printerFooter}>
            <Pressable disabled={printing} onPress={onPrintSetup} style={styles.printerGhost}>
              <Text style={styles.printerGhostText}>Rescan</Text>
            </Pressable>
            <Pressable disabled={printing} onPress={() => setPrinterOpen(false)} style={styles.printerCancel}>
              <Text style={styles.printerCancelText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isTablet) {
    return (
      <View style={styles.scrim}>
        <View style={styles.dialog}>
          {backButton}
          {successHeader}
          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ paddingHorizontal: 30 }} showsVerticalScrollIndicator={false}>
            {body}
          </ScrollView>
          {sale && actions}
        </View>
        {printerModal}
      </View>
    );
  }

  return (
    <View style={[styles.phoneRoot, { paddingTop: insets.top }]}>
      {backButton}
      {successHeader}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.phoneCard}>{body}</View>
      </ScrollView>
      <View style={[styles.phoneFooter, { paddingBottom: insets.bottom + 20 }]}>
        {sale && (
          <>
            <View style={styles.actionsPhoneRow}>
              <PressableScale onPress={onPrint} style={[styles.actionOutline, { flex: 1 }]}>
                <Ionicons name="print-outline" size={17} color={tokens.color.inkStrong} />
                <Text style={styles.actionOutlineText}>Print</Text>
              </PressableScale>
              <PressableScale onPress={onShare} style={[styles.actionOutline, { flex: 1 }]}>
                <Ionicons name="share-outline" size={17} color={tokens.color.inkStrong} />
                <Text style={styles.actionOutlineText}>Share</Text>
              </PressableScale>
            </View>
            <PressableScale onPress={newSale} style={[styles.actionPrimary, { marginTop: 10, height: 54 }]}>
              <Text style={styles.actionPrimaryText}>New sale</Text>
            </PressableScale>
          </>
        )}
      </View>
      {printerModal}
    </View>
  );
}

function InfoCol({ label, value, mono, align }: { label: string; value: string; mono?: boolean; align?: "right" }) {
  return (
    <View style={align === "right" ? { alignItems: "flex-end" } : undefined}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && { fontFamily: tokens.font.mono, fontSize: 13.5 }]}>{value}</Text>
    </View>
  );
}

function TotRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.totRow}>
      <Text style={styles.totLabel}>{label}</Text>
      <Text style={styles.totValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { padding: 40, alignItems: "center" },
  muted: { fontFamily: tokens.font.sans, color: tokens.color.inkMuted },

  backButton: {
    position: "absolute",
    top: 14,
    left: 14,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: tokens.color.surface,
    borderWidth: 1,
    borderColor: tokens.color.borderMuted,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1B2A44",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  scrim: {
    flex: 1,
    backgroundColor: "rgba(31,37,47,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  dialog: {
    width: 560,
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
  phoneCard: {
    backgroundColor: tokens.color.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tokens.color.border,
    padding: 18,
  },
  phoneFooter: { paddingHorizontal: 16, paddingTop: 8 },
  actionsPhoneRow: { flexDirection: "row", gap: 10 },

  successBand: { alignItems: "center", backgroundColor: SUCCESS_BG },
  successBandTablet: { paddingTop: 30, paddingBottom: 22, gap: 10, paddingHorizontal: 30 },
  successBandPhone: { paddingTop: 26, paddingBottom: 28, gap: 9, paddingHorizontal: 24 },
  checkCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: tokens.color.successStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontFamily: tokens.font.display, fontSize: 22, color: "#1E7A45", letterSpacing: -0.5 },
  successSub: { fontFamily: tokens.font.sans, fontSize: 13, color: "#3C8A5C" },

  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 20, paddingTop: 22 },
  infoLabel: { fontFamily: tokens.font.sansMedium, fontSize: 12.5, color: tokens.color.inkMuted },
  infoValue: { marginTop: 4, fontFamily: tokens.font.sansSemiBold, fontSize: 14, color: tokens.color.ink },
  cashier: { marginTop: 10, fontFamily: tokens.font.sans, fontSize: 12, color: tokens.color.inkMuted },

  lines: { marginTop: 14 },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: tokens.color.surfaceSunken,
  },
  lineName: { fontFamily: tokens.font.sansSemiBold, fontSize: 13.5, color: tokens.color.ink },
  lineMeta: { marginTop: 2, fontFamily: tokens.font.sans, fontSize: 11.5, color: tokens.color.inkFaint },
  lineTotal: { fontFamily: tokens.font.sansBold, fontSize: 13.5, color: tokens.color.ink },

  totals: { marginTop: 18, padding: 16, borderRadius: 14, backgroundColor: tokens.color.panel },
  totRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  totLabel: { fontFamily: tokens.font.sans, fontSize: 13, color: tokens.color.inkSoft },
  totValue: { fontFamily: tokens.font.sansMedium, fontSize: 13, color: tokens.color.ink },
  totalPaidRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 5,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: tokens.color.borderMuted,
  },
  totalPaidLabel: { fontFamily: tokens.font.sansBold, fontSize: 15, color: tokens.color.ink },
  totalPaidValue: { fontFamily: tokens.font.displayBlack, fontSize: 34, color: tokens.color.ink, letterSpacing: -1.2 },

  actions: { flexDirection: "row", gap: 10, padding: 20, paddingHorizontal: 30 },
  actionOutline: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.color.borderMuted,
    backgroundColor: tokens.color.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  actionOutlineText: { fontFamily: tokens.font.sansSemiBold, fontSize: 14, color: tokens.color.inkStrong },
  actionPrimary: {
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
  actionPrimaryText: { fontFamily: tokens.font.sansBold, fontSize: 14.5, color: tokens.color.accentForeground },

  /* Printer picker modal */
  printerScrim: {
    flex: 1,
    backgroundColor: "rgba(31,37,47,0.52)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  printerDialog: {
    width: 400,
    maxWidth: "100%",
    backgroundColor: tokens.color.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#1B2A44",
    shadowOpacity: 0.28,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 24 },
    elevation: 18,
  },
  printerHeader: { flexDirection: "row", alignItems: "center", gap: 9 },
  printerTitle: { fontFamily: tokens.font.sansBold, fontSize: 16, color: tokens.color.ink },
  printerHint: { marginTop: 4, marginBottom: 14, fontFamily: tokens.font.sans, fontSize: 12.5, color: tokens.color.inkSoft },
  printerStatus: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: tokens.color.panel,
    marginBottom: 14,
  },
  printerStatusText: { fontFamily: tokens.font.sans, fontSize: 13, color: tokens.color.inkSoft },
  printerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.color.borderMuted,
    marginBottom: 8,
  },
  printerName: { fontFamily: tokens.font.sansSemiBold, fontSize: 14, color: tokens.color.ink },
  printerAddr: { marginTop: 1, fontFamily: tokens.font.mono, fontSize: 11, color: tokens.color.inkFaint },
  printerFooter: { flexDirection: "row", gap: 10, marginTop: 14 },
  printerGhost: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: tokens.color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  printerGhostText: { fontFamily: tokens.font.sansSemiBold, fontSize: 13.5, color: tokens.color.inkStrong },
  printerCancel: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    backgroundColor: tokens.color.accentBrand,
    alignItems: "center",
    justifyContent: "center",
  },
  printerCancelText: { fontFamily: tokens.font.sansBold, fontSize: 13.5, color: tokens.color.accentForeground },
});
