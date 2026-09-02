import * as SecureStore from "expo-secure-store";
import ThermalPrinter, {
  ThermalPrinterError,
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
 *
 * The flow mirrors the VVA reception app: request runtime Bluetooth/location
 * permissions up front, discover (and merge) paired + nearby printers, keep a
 * "last printer" in SecureStore so reprints skip re-selection, and surface
 * typed error codes instead of bare native exceptions.
 */

/** Font-A character budget across the 48mm printable width. */
const LINE_WIDTH = 32;

export type { Device } from "react-native-thermal-printer-driver";

const LAST_PRINTER_KEY = "smart_switch_last_printer";

export type PrinterErrorCode =
  | "UNSUPPORTED_PLATFORM"
  | "LOCATION_SERVICES_OFF"
  | "PERMISSION_DENIED"
  | "BLUETOOTH_DISABLED"
  | "NO_DEVICE_SELECTED"
  | "CONNECTION_FAILED"
  | "PRINT_FAILED"
  | "UNKNOWN";

export interface PrinterError {
  code: PrinterErrorCode;
  message: string;
}

export type PrinterResult<T> = { ok: true; data: T } | { ok: false; error: PrinterError };

function err(code: PrinterErrorCode, message: string): PrinterResult<never> {
  return { ok: false, error: { code, message } };
}

function ok<T>(data: T): PrinterResult<T> {
  return { ok: true, data };
}

export function isPrinterSupported(): boolean {
  return Platform.OS === "android";
}

// Cast through the function's own parameter type rather than importing RN's
// `Permission` union directly — robust to whichever RN/TS version is
// installed, and avoids guessing at the exact type's export path.
type RequestMultipleArg = Parameters<typeof PermissionsAndroid.requestMultiple>[0];

const BLUETOOTH_PERMISSIONS = [
  "android.permission.BLUETOOTH_SCAN",
  "android.permission.BLUETOOTH_CONNECT",
  "android.permission.ACCESS_FINE_LOCATION",
] as unknown as RequestMultipleArg;

/* ------------------------------ Permissions ------------------------------ */

/**
 * Requests the runtime permissions classic Bluetooth discovery needs. On
 * Android 12+ these are runtime ("dangerous") permissions: the OS only grants
 * them after showing the "Nearby devices" dialog. The thermal-printer native
 * module declares but never requests them, so we request them here with
 * React Native's PermissionsAndroid to surface the dialog.
 *
 * Gracefully treats constants that don't exist on this OS version (e.g.
 * BLUETOOTH_SCAN on Android < 12) as "nothing to grant" rather than failing.
 */
export async function ensurePrinterPermission(): Promise<boolean> {
  if (!isPrinterSupported()) {
    return true;
  }
  try {
    const results = await PermissionsAndroid.requestMultiple(BLUETOOTH_PERMISSIONS);
    return Object.values(results).every(
      (status) => status === PermissionsAndroid.RESULTS.GRANTED,
    );
  } catch {
    // Unsupported constant on this OS — treat as granted.
    return true;
  }
}

/** Android-only Bluetooth gate: platform check + runtime permission request. */
export async function ensureBluetoothReady(): Promise<PrinterResult<void>> {
  if (!isPrinterSupported()) {
    return err("UNSUPPORTED_PLATFORM", "Bluetooth printing is only available on Android.");
  }
  const granted = await ensurePrinterPermission();
  if (!granted) {
    return err("PERMISSION_DENIED", "Bluetooth permission was denied. Enable it in system settings to print.");
  }
  return ok(undefined);
}

/* ------------------------------ Discovery ------------------------------- */

/**
 * `ThermalPrinter.scan()`'s resolved shape can arrive as either a plain object
 * or (on some forks) a JSON-encoded string — same quirk as the reception app's
 * `BluetoothManager.scanDevices()`. Parse defensively instead of trusting the
 * naive typing.
 */
function parseDeviceList(value: unknown): Device[] {
  if (Array.isArray(value)) return value as Device[];
  if (typeof value === "string" && value.length > 0) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseScanResult(raw: unknown): { paired: Device[]; found: Device[] } {
  let obj: { paired?: unknown; found?: unknown } = {};
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw) as { paired?: unknown; found?: unknown };
    } catch {
      obj = {};
    }
  } else if (raw && typeof raw === "object") {
    obj = raw as { paired?: unknown; found?: unknown };
  }
  return { paired: parseDeviceList(obj.paired), found: parseDeviceList(obj.found) };
}

/** Discover paired + nearby Bluetooth thermal printers. */
export async function scanPrinters(): Promise<PrinterResult<Device[]>> {
  const ready = await ensureBluetoothReady();
  if (!ready.ok) {
    return ready;
  }
  try {
    const raw = await ThermalPrinter.scan();
    const { paired, found } = parseScanResult(raw);
    const byAddress = new Map<string, Device>();
    for (const d of paired) if (!byAddress.has(d.address)) byAddress.set(d.address, d);
    for (const d of found) if (!byAddress.has(d.address)) byAddress.set(d.address, d);
    return ok(Array.from(byAddress.values()));
  } catch (e) {
    // SCAN_FAILED (native code "DISCOVER"/"NOT_STARTED") almost exclusively
    // means the device's system Location service is off — Android requires it
    // for classic Bluetooth discovery on API 29+, even when the app already
    // holds the BLUETOOTH_SCAN/ACCESS_FINE_LOCATION permissions.
    const detail =
      e instanceof ThermalPrinterError
        ? { code: e.code, message: e.message }
        : e instanceof Error
          ? { code: "", message: e.message }
          : { code: "", message: String(e) };
    if (detail.code === "SCAN_FAILED" || /not started|not_started/i.test(detail.message)) {
      return err(
        "LOCATION_SERVICES_OFF",
        "Turn on Location (GPS) in this device's settings, then try again — Android requires it for Bluetooth scanning.",
      );
    }
    return err("UNKNOWN", "Couldn't scan for nearby Bluetooth printers.");
  }
}

/* --------------------------- Last printer memory -------------------------- */

/** Remember the last printer we connected to so reprints skip re-selection. */
let lastAddress: string | null = null;

/** The currently remembered printer address, if any. */
export function getPrinterAddress(): string | null {
  return lastAddress;
}

/** Clear the remembered printer (e.g. user switches printers). */
export function resetPrinterAddress(): void {
  lastAddress = null;
  void SecureStore.deleteItemAsync(LAST_PRINTER_KEY).catch(() => {});
}

/** Persist the most recent successful printer so future reprints skip a scan. */
export async function rememberPrinter(device: { address: string; name?: string }): Promise<void> {
  lastAddress = device.address;
  await SecureStore.setItemAsync(
    LAST_PRINTER_KEY,
    JSON.stringify({ address: device.address, name: device.name ?? "" }),
  );
}

/** Prevously-saved printer, if any. */
export async function getLastPrinter(): Promise<{ address: string; name: string } | null> {
  if (lastAddress) return { address: lastAddress, name: "" };
  const raw = await SecureStore.getItemAsync(LAST_PRINTER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { address?: string; name?: string };
    if (!parsed.address) return null;
    lastAddress = parsed.address;
    return { address: parsed.address, name: parsed.name ?? "" };
  } catch {
    return null;
  }
}

/* ------------------------------- Errors ---------------------------------- */

/** Human-friendly reason for a printer failure surfaced to the UI. */
export function describePrinterError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (/permission/i.test(msg)) return "Bluetooth permission is required to print.";
  if (/location|GPS|not started|not_started/i.test(msg)) return "Turn on Location (GPS), then try again.";
  if (/disabled|switched off|turned off/i.test(msg)) return "Bluetooth is switched off. Turn it on and try again.";
  if (/not supported/i.test(msg)) return "This device does not support Bluetooth printing.";
  if (/not found|no printer/i.test(msg)) return "No thermal printer found. Pair one in system Bluetooth settings first.";
  if (/timeout/i.test(msg)) return "The printer did not respond. Check that it is on and in range.";
  return `Could not print: ${msg || "unknown error"}`;
}

/* ------------------------------ Receipt build ---------------------------- */

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

/* -------------------------------- Printing ------------------------------- */

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
    await rememberPrinter({ address });
  } finally {
    void ThermalPrinter.disconnect(address).catch(() => {});
  }
}