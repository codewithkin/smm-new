import ThermalPrinter, {
  columns,
  cut,
  feed,
  line,
  text,
  type Device,
  type Node,
  type PrinterOptions,
} from "react-native-thermal-printer-driver";

import { PermissionsAndroid, Platform } from "react-native";

import { formatCurrency, formatDate, paymentLabel, receiptId } from "@/lib/format";
import type { SaleDetail } from "@/lib/types";

/**
 * Thermal receipt printing over Bluetooth for 58mm paper.
 *
 * 58mm paper gives a 48mm print width = 32 characters on Font A. All line-item
 * rows are built with `columns()` so the name and amount stay aligned without
 * overflowing the paper edge.
 */

/** Font-A character budget across the 48mm printable width. */
const LINE_WIDTH = 32;

export type { Device } from "react-native-thermal-printer-driver";

/** Remember the last printer we connected to so reprints skip re-selection. */
let lastAddress: string | null = null;

/** The currently remembered printer address, if any. */
export function getPrinterAddress(): string | null {
  return lastAddress;
}

/** Clear the remembered printer (e.g. user switches printers). */
export function resetPrinterAddress(): void {
  lastAddress = null;
}

/** Human-friendly reason for a printer failure surfaced to the UI. */
export function describePrinterError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (/permission/i.test(msg)) return "Bluetooth permission is required to print.";
  if (/disabled|switched off|turned off/i.test(msg)) return "Bluetooth is switched off. Turn it on and try again.";
  if (/not supported/i.test(msg)) return "This device does not support Bluetooth printing.";
  if (/not found|no printer/i.test(msg)) return "No thermal printer found. Pair one in system Bluetooth settings first.";
  if (/timeout/i.test(msg)) return "The printer did not respond. Check that it is on and in range.";
  return `Could not print: ${msg || "unknown error"}`;
}

/** Discover paired + nearby Bluetooth thermal printers. */
export async function scanPrinters(): Promise<{ paired: Device[]; found: Device[] }> {
  return ThermalPrinter.scan();
}

/** All candidate printers without the scan ceremony (paired first). */
export async function findPrinters(): Promise<Device[]> {
  const { paired, found } = await scanPrinters();
  return [...paired, ...found];
}

/**
 * Android 12+ treats BLUETOOTH_SCAN and BLUETOOTH_CONNECT as runtime ("dangerous")
 * permissions: the OS only grants them after the app shows the "Nearby devices"
 * dialog. The thermal-printer native module declares but never requests them, so we
 * request them here with React Native's PermissionsAndroid to surface the dialog.
 *
 * The manifest already declares these via the config plugin, so requestMultiple is
 * safe to call at app launch and again before printing. On iOS (and Android < 12)
 * there is nothing to request.
 */
export async function ensurePrinterPermission(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return true;
  }
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return Object.values(granted).every(
      (status) => status === PermissionsAndroid.RESULTS.GRANTED,
    );
  } catch {
    return false;
  }
}

/** Align a label and its value across the printable width. */
function totalRow(label: string, value: string, bold = false): Node {
  return columns([
    { content: label, width: LINE_WIDTH - 12, align: "left", style: bold ? { bold: true } : undefined },
    { content: value, width: 12, align: "right", style: bold ? { bold: true } : undefined },
  ]);
}

/** Build a 58mm ESC/POS receipt document from a completed sale. */
export function buildSaleReceipt(sale: SaleDetail): Node[] {
  const nodes: Node[] = [];

  // Header
  nodes.push(text("Smart Switch Mobile", { align: "center", bold: true }));
  nodes.push(text("Till 01", { align: "center" }));
  nodes.push(text(receiptId(sale.id, sale.createdAt), { align: "center" }));
  nodes.push(text(formatDate(sale.createdAt), { align: "center" }));
  nodes.push(line({ style: "dashed" }));

  // Line items (qty x name on the left, line amount on the right)
  for (const l of sale.lines) {
    nodes.push(
      columns([
        { content: `${l.quantity} x ${l.name}`, width: LINE_WIDTH - 12, align: "left" },
        { content: formatCurrency(l.price * l.quantity), width: 12, align: "right", style: { font: "B" } },
      ]),
    );
  }

  nodes.push(line({ style: "dashed" }));

  // Totals
  const subtotal = sale.total + sale.discount;
  nodes.push(totalRow("Subtotal", formatCurrency(subtotal)));
  if (sale.discount > 0) {
    nodes.push(totalRow("Discount", `-${formatCurrency(sale.discount)}`));
  }
  nodes.push(totalRow("TOTAL", formatCurrency(sale.total), true));

  nodes.push(text(`Paid via ${paymentLabel(sale.paymentMethod)}`, { align: "center" }));
  nodes.push(feed(2));

  // Footer + cut
  nodes.push(text("Thank you!", { align: "center" }));
  nodes.push(feed(3));
  nodes.push(cut({ partial: true }));

  return nodes;
}

/**
 * Connect to the given printer and print a 58mm sale receipt, cutting at the end.
 */
export async function printSaleReceipt(address: string, sale: SaleDetail): Promise<void> {
  const nodes = buildSaleReceipt(sale);
  const options: PrinterOptions = { paperWidthMm: 58, timeout: 20000 };

  await ThermalPrinter.connect(address, { timeout: 10000 });
  try {
    const result = await ThermalPrinter.print(address, nodes, options);
    if (!result.success) {
      throw new Error(result.error?.message || "Print failed");
    }
    lastAddress = address;
  } finally {
    void ThermalPrinter.disconnect(address).catch(() => {});
  }
}