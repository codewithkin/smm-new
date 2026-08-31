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

export const CATEGORY_META: Record<Category, { label: string; icon: string }> = {
  smartphone: { label: "Smartphones", icon: "phone-portrait" },
  "audio-device": { label: "Audio Devices", icon: "headset" },
  accessory: { label: "Accessories", icon: "phone-portrait" },
};

export const CATEGORIES: Category[] = [
  "smartphone",
  "audio-device",
  "accessory",
];

export const PAYMENT_METHODS: PaymentMethodMeta[] = [
  { value: "cash", label: "Cash", icon: "cash" },
  { value: "ecocash", label: "EcoCash", icon: "phone-portrait" },
  { value: "onemoney", label: "OneMoney", icon: "phone-portrait" },
];

export function paymentLabel(method: PaymentMethod | string): string {
  const meta = PAYMENT_METHODS.find((m) => m.value === method);
  return meta?.label ?? method;
}
