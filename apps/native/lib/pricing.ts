import type { CartLine, PaymentMethod } from "./types";

export type PriceBreakdown = {
  subtotal: number;
  /** Flat amount discount applied to the sale. */
  discount: number;
  total: number;
};

/**
 * Computes the monetary breakdown for a set of cart lines.
 * `discount` is a flat amount (in the same currency units) subtracted from the
 * subtotal. Never goes below zero.
 */
export function computeTotals(
  lines: CartLine[],
  discount: number,
): PriceBreakdown {
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const safeDiscount = Math.max(0, Math.min(discount, subtotal));
  return {
    subtotal,
    discount: safeDiscount,
    total: subtotal - safeDiscount,
  };
}

/**
 * Change due when a customer pays with cash. Returns 0 when the amount
 * received is less than the total (short payment).
 */
export function computeChange(total: number, amountReceived: number): number {
  if (amountReceived < 0) return 0;
  return Math.max(0, amountReceived - total);
}

/**
 * Validates that every line in the cart can be fulfilled given its stock.
 * All POS categories are physical inventory, so every line is checked.
 *
 * @returns the first stock conflict, or `null` if the cart is valid.
 */
export function findStockConflict(
  lines: CartLine[],
): { productId: number; quantity: number; stock: number } | null {
  for (const line of lines) {
    if (line.quantity > line.stock) {
      return { productId: line.productId, quantity: line.quantity, stock: line.stock };
    }
  }
  return null;
}

export function isValidPaymentMethod(method: string): method is PaymentMethod {
  return method === "cash" || method === "ecocash" || method === "onemoney";
}
