import type { Category, PaymentMethod, PaymentMethodMeta } from "./types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCurrency(value: number): string {
  return currency.format(value);
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Clock time only, e.g. "2:12 PM". */
export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Human receipt reference for a sale, e.g. "RCP-2026-0007". */
export function receiptId(id: number, createdAt: number): string {
  return `RCP-${new Date(createdAt).getFullYear()}-${String(id).padStart(4, "0")}`;
}

export const CATEGORY_META: Record<
  Category,
  { label: string; short: string; icon: string }
> = {
  smartphone: { label: "Smartphones", short: "Phones", icon: "phone-portrait-outline" },
  "audio-device": { label: "Audio Devices", short: "Audio", icon: "headset-outline" },
  accessory: { label: "Accessories", short: "Accessories", icon: "hardware-chip-outline" },
};

export const CATEGORIES: Category[] = [
  "smartphone",
  "audio-device",
  "accessory",
];

/** Provider sub-label shown under each payment method (design detail). */
export const PAYMENT_METHODS: (PaymentMethodMeta & { sub: string })[] = [
  { value: "cash", label: "Cash", icon: "cash-outline", sub: "USD" },
  { value: "ecocash", label: "EcoCash", icon: "phone-portrait-outline", sub: "Econet" },
  { value: "onemoney", label: "OneMoney", icon: "phone-portrait-outline", sub: "NetOne" },
];

export function paymentLabel(method: PaymentMethod | string): string {
  const meta = PAYMENT_METHODS.find((m) => m.value === method);
  return meta?.label ?? method;
}
