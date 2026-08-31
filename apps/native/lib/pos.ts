import type { SQLiteDatabase } from "expo-sqlite";

import { productQueries, saleQueries, stockQueries } from "@/lib/db/database";
import { computeTotals, isValidPaymentMethod } from "@/lib/pricing";
import type {
  CartLine,
  CheckoutResult,
  PaymentMethod,
  StockAdjustmentInput,
  StockMovementType,
} from "@/lib/types";

export type CheckoutInput = {
  lines: CartLine[];
  discount: number;
  paymentMethod: PaymentMethod;
};

/**
 * Core POS business flow: verifies the cart against current stock levels,
 * then writes the sale and decrements inventory (recording stock movements)
 * inside a single transaction.
 *
 * Stock is re-read from the database at checkout time (rather than trusting
 * the cached `line.stock`) to guard against stale inventory.
 */
export async function checkout(
  db: SQLiteDatabase,
  input: CheckoutInput,
): Promise<CheckoutResult> {
  if (input.lines.length === 0) {
    return { ok: false, error: "Cart is empty" };
  }

  if (!isValidPaymentMethod(input.paymentMethod)) {
    return { ok: false, error: "Invalid payment method" };
  }

  const { total } = computeTotals(input.lines, input.discount);
  if (total < 0) {
    return { ok: false, error: "Discounted total cannot be negative" };
  }

  const freshLines: CartLine[] = [];

  for (const line of input.lines) {
    const product = await productQueries.getById(db, line.productId);
    if (!product) {
      return { ok: false, error: `Product no longer exists (${line.name})` };
    }
    if (!product.active) {
      return { ok: false, error: `${product.name} is no longer available` };
    }
    if (line.quantity > product.stock) {
      return {
        ok: false,
        error: `Only ${product.stock} of "${product.name}" in stock`,
      };
    }

    freshLines.push({
      productId: line.productId,
      name: product.name,
      price: product.price,
      quantity: line.quantity,
      stock: product.stock,
      category: product.category,
    });
  }

  const saleId = await saleQueries.create(db, {
    lines: freshLines,
    discount: input.discount,
    paymentMethod: input.paymentMethod,
  });

  return { ok: true, saleId };
}

/* ------------------------------- Stock service ------------------------------ */

export type StockAdjustmentResult = {
  ok: boolean;
  balanceAfter?: number;
  error?: string;
};

/**
 * Applies a stock adjustment (restock, loss, manual adjust, or sale-return)
 * to a product and records it in the inventory ledger.
 */
export async function adjustStock(
  db: SQLiteDatabase,
  productId: number,
  input: StockAdjustmentInput,
): Promise<StockAdjustmentResult> {
  const product = await productQueries.getById(db, productId);
  if (!product) {
    return { ok: false, error: "Product not found" };
  }

  const qty = Math.trunc(input.quantity);
  if (qty <= 0) {
    return { ok: false, error: "Quantity must be a positive whole number" };
  }

  const delta = input.type === "restock" || input.type === "sale-return" ? qty : -qty;

  // For removal types, refuse to oversell below zero.
  if (delta < 0 && product.stock + delta < 0) {
    return {
      ok: false,
      error: `Only ${product.stock} units available to remove`,
    };
  }

  const { balanceAfter } = await stockQueries.recordMovement(db, {
    productId,
    type: input.type,
    delta,
    note: input.note,
  });

  return { ok: true, balanceAfter };
}

/** Convenience: adds stock (receiving a purchase order). */
export function restockProduct(
  db: SQLiteDatabase,
  productId: number,
  quantity: number,
  note?: string,
) {
  return adjustStock(db, productId, {
    type: "restock",
    quantity,
    note: note ?? "Restock",
  });
}

/**
 * Removes stock for a reason other than a sale (damage/loss/adjustment).
 * `type` must be a removal type (`loss` or `adjust`).
 */
export function removeStock(
  db: SQLiteDatabase,
  productId: number,
  quantity: number,
  type: Exclude<StockMovementType, "restock" | "sale" | "sale-return"> = "loss",
  note?: string,
) {
  return adjustStock(db, productId, { type, quantity, note });
}

/** Sets the reorder point for a product. */
export async function setReorderPoint(
  db: SQLiteDatabase,
  productId: number,
  threshold: number,
): Promise<StockAdjustmentResult> {
  const product = await productQueries.getById(db, productId);
  if (!product) return { ok: false, error: "Product not found" };
  const value = Math.max(0, Math.trunc(threshold));
  await productQueries.setLowStockThreshold(db, productId, value);
  return { ok: true };
}
