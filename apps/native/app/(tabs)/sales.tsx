import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenScaffold } from "@/components/nav/screen-scaffold";
import { PressableScale } from "@/components/pos/pressable-scale";
import { useDatabase } from "@/contexts/database-context";
import { saleQueries } from "@/lib/db/database";
import { formatCurrency, formatTime, paymentLabel, receiptId } from "@/lib/format";
import { useIsTablet } from "@/lib/responsive";
import { tokens } from "@/lib/theme";
import type { PaymentMethod, SaleListItem } from "@/lib/types";

type PayFilter = PaymentMethod | "all";

const PAY_FILTERS: { key: PayFilter; label: string }[] = [
  { key: "all", label: "All payments" },
  { key: "cash", label: "Cash" },
  { key: "ecocash", label: "EcoCash" },
  { key: "onemoney", label: "OneMoney" },
];

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Badge colors per payment method (design: cash neutral, ecocash green, onemoney blue). */
function payBadge(method: PaymentMethod): { bg: string; fg: string } {
  if (method === "ecocash") return { bg: tokens.color.successBg, fg: tokens.color.success };
  if (method === "onemoney") return { bg: "#E8EEFB", fg: tokens.color.brandDark };
  return { bg: tokens.color.surfaceMuted, fg: tokens.color.inkStrong };
}

export default function SalesScreen() {
  const isTablet = useIsTablet();
  const router = useRouter();
  const { db, isReady } = useDatabase();

  const openReceipt = useCallback(
    (id: number) => router.push({ pathname: "/sale/[id]", params: { id: String(id) } }),
    [router],
  );

  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [summary, setSummary] = useState({ count: 0, revenue: 0, itemsSold: 0 });
  const [filter, setFilter] = useState<PayFilter>("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!db) return;
    const [list, sum] = await Promise.all([
      saleQueries.listWithItemCounts(db),
      saleQueries.summary(db, startOfToday()),
    ]);
    setSales(list);
    setSummary(sum);
    setLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(
    () => (filter === "all" ? sales : sales.filter((s) => s.paymentMethod === filter)),
    [sales, filter],
  );

  // Today's payment split + a small bar motif from recent sale totals.
  const { cashToday, mobileToday, bars } = useMemo(() => {
    const since = startOfToday();
    const today = sales.filter((s) => s.createdAt >= since);
    let cash = 0;
    let mobile = 0;
    for (const s of today) {
      if (s.paymentMethod === "cash") cash += s.total;
      else mobile += s.total;
    }
    const recent = [...sales].slice(0, 7).reverse();
    const max = Math.max(1, ...recent.map((s) => s.total));
    const b = recent.map((s) => Math.max(0.15, s.total / max));
    return { cashToday: cash, mobileToday: mobile, bars: b.length ? b : [0.3, 0.5, 0.4, 0.7, 0.6, 0.85, 1] };
  }, [sales]);

  const avg = summary.count > 0 ? summary.revenue / summary.count : 0;

  const summaryBlock = (
    <View style={isTablet ? styles.summaryRowTablet : undefined}>
      <RevenueHero
        revenue={summary.revenue}
        cash={cashToday}
        mobile={mobileToday}
        bars={bars}
        tablet={isTablet}
      />
      {isTablet ? (
        <>
          <StatCard label="Transactions" value={String(summary.count)} foot="today" />
          <StatCard label="Items sold" value={String(summary.itemsSold)} foot="today" />
          <StatCard label="Average sale" value={formatCurrency(avg)} foot="per sale" />
        </>
      ) : (
        <View style={styles.tileRow}>
          <StatTile label="Sales" value={String(summary.count)} />
          <StatTile label="Items" value={String(summary.itemsSold)} />
          <StatTile label="Avg sale" value={formatCurrency(avg)} />
        </View>
      )}
    </View>
  );

  const filterRow = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      {PAY_FILTERS.map((f) => {
        const active = filter === f.key;
        return (
          <PressableScale
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.filterChip, active ? styles.filterChipActive : styles.filterChipIdle]}
          >
            <Text style={[styles.filterChipText, active && { color: tokens.color.accentForeground }]}>
              {isTablet ? f.label : f.label.replace(" payments", "")}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );

  const list = (
    <View style={styles.listCard}>
      {isTablet && (
        <View style={[styles.rowGrid, styles.tableHead]}>
          <Text style={[styles.headCell, styles.colReceipt]}>Receipt</Text>
          <Text style={[styles.headCell, styles.colTime]}>Time</Text>
          <Text style={[styles.headCell, styles.colItems]}>Items</Text>
          <Text style={[styles.headCell, styles.colPay]}>Payment</Text>
          <Text style={[styles.headCell, styles.colCashier]}>Date</Text>
          <Text style={[styles.headCell, styles.colTotal, { textAlign: "right" }]}>Total</Text>
        </View>
      )}

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={38} color={tokens.color.inkSubtle} />
          <Text style={styles.emptyText}>{loading ? "Loading sales…" : "No sales yet"}</Text>
          {!loading && <Text style={styles.emptySub}>Completed sales will appear here</Text>}
        </View>
      ) : isTablet ? (
        filtered.map((s, i) => (
          <SaleTableRow key={s.id} sale={s} last={i === filtered.length - 1} onPress={() => openReceipt(s.id)} />
        ))
      ) : (
        filtered.map((s, i) => (
          <SalePhoneRow key={s.id} sale={s} last={i === filtered.length - 1} onPress={() => openReceipt(s.id)} />
        ))
      )}
    </View>
  );

  const subtitle = `Today · ${summary.count} ${summary.count === 1 ? "sale" : "sales"}`;

  const refreshControl = (
    <RefreshControl refreshing={loading} onRefresh={load} tintColor={tokens.color.brandDark} />
  );

  if (!isReady) {
    return (
      <ScreenScaffold title="Sales" subtitle={subtitle}>
        <View style={styles.center}>
          <Text style={styles.muted}>Opening database…</Text>
        </View>
      </ScreenScaffold>
    );
  }

  if (isTablet) {
    return (
      <ScreenScaffold title="Sales" subtitle={subtitle}>
        <View style={{ flex: 1, gap: 12, minHeight: 0 }}>
          {summaryBlock}
          {filterRow}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
            {list}
          </ScrollView>
        </View>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title="Sales" subtitle={subtitle}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 14 }}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        {summaryBlock}
        {filterRow}
        {list}
      </ScrollView>
    </ScreenScaffold>
  );
}

/* -------------------------------- Sub-parts ------------------------------- */

function RevenueHero({
  revenue,
  cash,
  mobile,
  bars,
  tablet,
}: {
  revenue: number;
  cash: number;
  mobile: number;
  bars: number[];
  tablet: boolean;
}) {
  const dateLabel = new Date().toLocaleDateString([], { day: "numeric", month: "short" });
  return (
    <View style={[styles.hero, tablet ? styles.heroTablet : styles.heroPhone]}>
      <View style={styles.heroTop}>
        <Text style={styles.heroLabel}>Revenue today</Text>
        <View style={styles.heroDateChip}>
          <Text style={styles.heroDateText}>{dateLabel}</Text>
        </View>
      </View>
      <Text style={[styles.heroValue, { fontSize: tablet ? 42 : 36 }]}>{formatCurrency(revenue)}</Text>
      <Text style={styles.heroSplit}>
        Cash {formatCurrency(cash)} · Mobile money {formatCurrency(mobile)}
      </Text>
      <View style={[styles.bars, { marginTop: tablet ? 12 : 12 }]}>
        {bars.map((h, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              { height: `${Math.round(h * 100)}%`, backgroundColor: i === bars.length - 1 ? "#fff" : "rgba(255,255,255,0.28)" },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function StatCard({ label, value, foot }: { label: string; value: string; foot: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statFoot}>{foot}</Text>
    </View>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

function PayBadge({ method }: { method: PaymentMethod }) {
  const c = payBadge(method);
  return (
    <View style={[styles.payBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.payBadgeText, { color: c.fg }]}>{paymentLabel(method)}</Text>
    </View>
  );
}

function SaleTableRow({ sale, last, onPress }: { sale: SaleListItem; last: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={[styles.rowGrid, styles.tableRow, last && { borderBottomWidth: 0 }]}>
      <Text style={[styles.cellMono, styles.colReceipt]}>{receiptId(sale.id, sale.createdAt)}</Text>
      <Text style={[styles.cell, styles.colTime]}>{formatTime(sale.createdAt)}</Text>
      <Text style={[styles.cell, styles.colItems]}>
        {sale.itemCount} {sale.itemCount === 1 ? "item" : "items"}
      </Text>
      <View style={styles.colPay}>
        <PayBadge method={sale.paymentMethod} />
      </View>
      <Text style={[styles.cell, styles.colCashier]}>
        {new Date(sale.createdAt).toLocaleDateString([], { day: "numeric", month: "short" })}
      </Text>
      <Text style={[styles.cellTotal, styles.colTotal]}>{formatCurrency(sale.total)}</Text>
    </PressableScale>
  );
}

function SalePhoneRow({ sale, last, onPress }: { sale: SaleListItem; last: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={[styles.phoneRow, last && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.cellMono}>{receiptId(sale.id, sale.createdAt)}</Text>
        <Text style={styles.phoneSub}>
          {formatTime(sale.createdAt)} · {sale.itemCount} {sale.itemCount === 1 ? "item" : "items"} ·{" "}
          {paymentLabel(sale.paymentMethod)}
        </Text>
      </View>
      <Text style={styles.phoneTotal}>{formatCurrency(sale.total)}</Text>
    </PressableScale>
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

  summaryRowTablet: { flexDirection: "row", gap: 12, height: 156 },

  /* Revenue hero */
  hero: {
    backgroundColor: "#2F6BE0",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#2F6BE0",
    shadowOpacity: 0.3,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  heroTablet: { flex: 1.55 },
  heroPhone: { borderRadius: 20 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  heroLabel: { fontFamily: tokens.font.sansMedium, fontSize: 12.5, color: "rgba(255,255,255,0.78)" },
  heroDateChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.16)" },
  heroDateText: { fontFamily: tokens.font.sansSemiBold, fontSize: 11, color: "#fff" },
  heroValue: {
    marginTop: 8,
    fontFamily: tokens.font.displayBlack,
    color: "#fff",
    letterSpacing: -1.4,
  },
  heroSplit: { marginTop: 6, fontFamily: tokens.font.sans, fontSize: 12, color: "rgba(255,255,255,0.7)" },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 8, height: 44 },
  bar: { width: 12, borderRadius: 4 },

  /* Tablet stat cards */
  statCard: {
    flex: 1,
    backgroundColor: tokens.color.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tokens.color.border,
    padding: 18,
    justifyContent: "space-between",
    ...CARD_SHADOW,
  },
  statLabel: { fontFamily: tokens.font.sansMedium, fontSize: 13, color: tokens.color.inkSoft },
  statValue: { fontFamily: tokens.font.displayBlack, fontSize: 36, color: tokens.color.ink, letterSpacing: -1.2 },
  statFoot: { fontFamily: tokens.font.sans, fontSize: 11.5, color: tokens.color.inkFaint },

  /* Phone stat tiles */
  tileRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  statTile: {
    flex: 1,
    backgroundColor: tokens.color.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tokens.color.border,
    padding: 14,
    ...CARD_SHADOW,
  },
  tileValue: { marginTop: 1, fontFamily: tokens.font.displayBlack, fontSize: 24, color: tokens.color.ink, letterSpacing: -0.7 },

  /* Filters */
  filterRow: { gap: 7, paddingRight: 8 },
  filterChip: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 11,
    justifyContent: "center",
    borderWidth: 1,
  },
  filterChipIdle: { backgroundColor: tokens.color.surface, borderColor: tokens.color.borderMuted },
  filterChipActive: { backgroundColor: tokens.color.accentBrand, borderColor: tokens.color.accentBrand },
  filterChipText: { fontFamily: tokens.font.sansSemiBold, fontSize: 12.5, color: tokens.color.ink },

  /* List card */
  listCard: {
    backgroundColor: tokens.color.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tokens.color.border,
    overflow: "hidden",
    ...CARD_SHADOW,
  },
  rowGrid: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 22,
  },
  tableHead: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.borderMuted,
  },
  headCell: { fontFamily: tokens.font.sansMedium, fontSize: 12.5, color: tokens.color.inkMuted },
  tableRow: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.surfaceMuted,
  },
  colReceipt: { width: 168 },
  colTime: { width: 96 },
  colItems: { width: 84 },
  colPay: { width: 140 },
  colCashier: { flex: 1 },
  colTotal: { width: 96 },
  cell: { fontFamily: tokens.font.sans, fontSize: 13, color: tokens.color.inkSoft },
  cellMono: { fontFamily: tokens.font.mono, fontSize: 12.5, color: tokens.color.ink },
  cellTotal: { fontFamily: tokens.font.sansBold, fontSize: 14, color: tokens.color.ink, textAlign: "right" },

  payBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7 },
  payBadgeText: { fontFamily: tokens.font.sansSemiBold, fontSize: 11.5 },

  /* Phone rows */
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.surfaceMuted,
  },
  phoneSub: { marginTop: 3, fontFamily: tokens.font.sans, fontSize: 11.5, color: tokens.color.inkMuted },
  phoneTotal: { fontFamily: tokens.font.sansBold, fontSize: 15, color: tokens.color.ink },

  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 56, gap: 6 },
  emptyText: { fontFamily: tokens.font.sansSemiBold, fontSize: 14, color: tokens.color.inkSoft, marginTop: 4 },
  emptySub: { fontFamily: tokens.font.sans, fontSize: 12, color: tokens.color.inkFaint },
});
