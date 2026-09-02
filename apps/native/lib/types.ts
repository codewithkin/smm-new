/** The person operating the till; captured on first run and shown on receipts. */
export type TillOperator = {
  /** Full display name (e.g. "Tanaka Moyo"). */
  name: string;
  /** Short form used on receipts when the full name is too long (e.g. "Tanaka M."). */
  shortName: string;
};

export type Category = "smartphone" | "audio-device" | "accessory";

export type Product = {
  id: number;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  /** Quantity at/below which the product is flagged as low stock. */
  lowStockThreshold: number;
  category: Category;
  active: boolean;
  createdAt: number;
};

/** A line in the current (in-progress) cart. */
export type CartLine = {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  /** Available stock at the time the line was added. Used for validation. */
  stock: number;
  category: Category;
};

export type CheckoutResult = {
  ok: boolean;
  saleId?: number;
  error?: string;
};

export type PaymentMethod = "cash" | "ecocash" | "onemoney";

export type PaymentMethodMeta = {
  value: PaymentMethod;
  label: string;
  icon: string;
};

export type Sale = {
  id: number;
  total: number;
  discount: number;
  paymentMethod: PaymentMethod;
  createdAt: number;
};

/** A line as persisted with a completed sale (historical snapshot). */
export type SaleLine = {
  productId: number;
  name: string;
  price: number;
  quantity: number;
};

export type SaleDetail = Sale & {
  lines: SaleLine[];
};

/** A sale row for history lists, with its total item count precomputed. */
export type SaleListItem = Sale & {
  itemCount: number;
};

/* ----------------------------- Stock management ----------------------------- */

/**
 * What caused a change to a product's on-hand quantity.
 * - `restock`: purchase/receiving adds stock.
 * - `sale`: items sold to a customer (auto-recorded at checkout).
 * - `sale-return`: returned stock from a sale.
 * - `loss`: damaged, stolen or expired stock removed.
 * - `adjust`: manual correction/recount.
 */
export type StockMovementType = "restock" | "sale" | "sale-return" | "loss" | "adjust";

/** A single recorded change to a product's stock level (ledger entry). */
export type StockMovement = {
  id: number;
  productId: number;
  type: StockMovementType;
  /** +/- change applied to on-hand quantity. */
  quantity: number;
  /** Stock level after this movement was applied. */
  balanceAfter: number;
  /** Optional reference (e.g. sale id for sales). */
  referenceId?: number | null;
  note?: string | null;
  createdAt: number;
};

/** Convenience shape used for list/history views of stock movements. */
export type StockMovementView = StockMovement & {
  productName: string;
  sku: string;
  category: Category;
};

/** Summary of a product's inventory status for management screens. */
export type StockStatus = {
  productId: number;
  name: string;
  sku: string;
  category: Category;
  stock: number;
  lowStockThreshold: number;
  status: "in-stock" | "low" | "out-of-stock";
  /** Monetary value of current on-hand stock (stock * cost). */
  stockValue: number;
};

export type StockAdjustmentInput = {
  type: StockMovementType;
  /** Positive quantity to add (restock) or remove (loss/adjust/return). */
  quantity: number;
  note?: string;
};
