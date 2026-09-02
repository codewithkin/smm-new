import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import { SCHEMA_SQL } from "./schema";
import type {
  Sale,
  SaleDetail,
  SaleLine,
  SaleListItem,
  CartLine,
  Category,
  PaymentMethod,
  StockMovement,
  StockMovementType,
  StockMovementView,
  StockStatus,
  Product,
  TillOperator,
} from "@/lib/types";

type Row = Record<string, any>;

export async function openDb(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync("smart-switch-pos.db");
  await db.execAsync(SCHEMA_SQL);
  await migrate(db);
  await seedIfEmpty(db);
  return db;
}

/** Non-destructive schema upgrades for databases created before newer versions. */
async function migrate(db: SQLiteDatabase) {
  const cols = await db.getAllAsync<Row>("PRAGMA table_info(products)");
  const names = new Set(cols.map((c) => String(c.name)));
  if (!names.has("low_stock_threshold")) {
    await db.execAsync(
      "ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER NOT NULL DEFAULT 5",
    );
  }
}

export function mapRow<T>(row: Row | null): T | null {
  return (row as T) ?? null;
}

function rowToProduct(row: Row): Product {
  return {
    id: Number(row.id),
    name: String(row.name),
    sku: String(row.sku),
    price: Number(row.price),
    cost: Number(row.cost),
    stock: Number(row.stock),
    lowStockThreshold:
      row.low_stock_threshold != null ? Number(row.low_stock_threshold) : 5,
    category: String(row.category) as Category,
    active: Boolean(row.active),
    createdAt: Number(row.created_at),
  };
}

/* --------------------------------- Products --------------------------------- */

export const productQueries = {
  async list(db: SQLiteDatabase): Promise<Product[]> {
    const rows = await db.getAllAsync<Row>(
      "SELECT * FROM products ORDER BY name COLLATE NOCASE ASC",
    );
    return rows.map(rowToProduct);
  },

  async listActive(db: SQLiteDatabase): Promise<Product[]> {
    const rows = await db.getAllAsync<Row>(
      "SELECT * FROM products WHERE active = 1 ORDER BY name COLLATE NOCASE ASC",
    );
    return rows.map(rowToProduct);
  },

  async getById(db: SQLiteDatabase, id: number): Promise<Product | null> {
    const row = await db.getFirstAsync<Row>("SELECT * FROM products WHERE id = ?", id);
    return row ? rowToProduct(row) : null;
  },

  /** Returns the id of another product sharing the SKU, or null if unique. */
  async findSkuConflict(db: SQLiteDatabase, sku: string, excludeId?: number) {
    const trimmed = sku.trim();
    if (!trimmed) return null;
    const row = await db.getFirstAsync<Row>(
      "SELECT id FROM products WHERE sku = ? AND id != ? LIMIT 1",
      trimmed,
      excludeId ?? -1,
    );
    return row ? Number(row.id) : null;
  },

  async search(db: SQLiteDatabase, query: string): Promise<Product[]> {
    const like = `%${query}%`;
    const rows = await db.getAllAsync<Row>(
      `SELECT * FROM products
       WHERE active = 1 AND (name LIKE ? OR sku LIKE ?)
       ORDER BY name COLLATE NOCASE ASC
       LIMIT 50`,
      like,
      like,
    );
    return rows.map(rowToProduct);
  },

  async create(
    db: SQLiteDatabase,
    input: {
      name: string;
      sku: string;
      price: number;
      cost: number;
      stock: number;
      lowStockThreshold: number;
      category: Category;
    },
  ): Promise<number> {
    let id = 0;
    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        `INSERT INTO products
           (name, sku, price, cost, stock, low_stock_threshold, category, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        input.name,
        input.sku.trim(),
        input.price,
        input.cost,
        input.stock,
        input.lowStockThreshold,
        input.category,
        Date.now(),
      );
      id = Number(result.lastInsertRowId);
      if (input.stock > 0) {
        await stockQueries.recordMovement(db, {
          productId: id,
          type: "restock",
          delta: input.stock,
          note: "Initial stock",
        });
      }
    });
    return id;
  },

  async update(
    db: SQLiteDatabase,
    id: number,
    input: {
      name: string;
      sku: string;
      price: number;
      cost: number;
      lowStockThreshold: number;
      category: Category;
      active: boolean;
    },
  ) {
    await db.runAsync(
      `UPDATE products SET
         name = ?, sku = ?, price = ?, cost = ?,
         low_stock_threshold = ?, category = ?, active = ?
       WHERE id = ?`,
      input.name,
      input.sku.trim(),
      input.price,
      input.cost,
      input.lowStockThreshold,
      input.category,
      input.active ? 1 : 0,
      id,
    );
  },

  async setActive(db: SQLiteDatabase, id: number, active: boolean) {
    await db.runAsync("UPDATE products SET active = ? WHERE id = ?", active ? 1 : 0, id);
  },

  async setLowStockThreshold(db: SQLiteDatabase, id: number, threshold: number) {
    await db.runAsync(
      "UPDATE products SET low_stock_threshold = ? WHERE id = ?",
      threshold,
      id,
    );
  },
};

/* ---------------------------------- Stock ---------------------------------- */

export const stockQueries = {
  /**
   * Applies a signed stock change to a product and appends a ledger entry.
   * The resulting balance never drops below zero. Returns the new balance.
   */
  async recordMovement(
    db: SQLiteDatabase,
    input: {
      productId: number;
      type: StockMovementType;
      /** Signed delta: positive adds stock, negative removes it. */
      delta: number;
      referenceId?: number | null;
      note?: string;
    },
  ): Promise<{ balanceAfter: number; appliedDelta: number }> {
    const product = await productQueries.getById(db, input.productId);
    if (!product) {
      throw new Error(`Product ${input.productId} does not exist`);
    }

    let appliedDelta = Math.trunc(input.delta);
    if (appliedDelta === 0) {
      return { balanceAfter: product.stock, appliedDelta: 0 };
    }

    const next = Math.max(0, product.stock + appliedDelta);
    // If the applied delta overshoots below zero, clamp the actual applied change.
    if (next === 0 && product.stock + appliedDelta < 0) {
      appliedDelta = -product.stock;
    }

    await db.runAsync("UPDATE products SET stock = ? WHERE id = ?", next, input.productId);
    await db.runAsync(
      `INSERT INTO stock_movements
         (product_id, type, quantity, balance_after, reference_id, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      input.productId,
      input.type,
      appliedDelta,
      next,
      input.referenceId ?? null,
      input.note ?? null,
      Date.now(),
    );

    return { balanceAfter: next, appliedDelta };
  },

  /** Full movement history for a single product, newest first. */
  async getHistory(
    db: SQLiteDatabase,
    productId: number,
    limit = 100,
  ): Promise<StockMovement[]> {
    const rows = await db.getAllAsync<Row>(
      "SELECT * FROM stock_movements WHERE product_id = ? ORDER BY id DESC LIMIT ?",
      productId,
      limit,
    );
    return rows.map(rowToMovement);
  },

  /** Movement history across all products, newest first (for a global ledger). */
  async listDashboard(db: SQLiteDatabase, limit = 100): Promise<StockMovementView[]> {
    const rows = await db.getAllAsync<Row>(
      `SELECT m.*, p.name AS product_name, p.sku AS product_sku, p.category AS product_category
       FROM stock_movements m
       JOIN products p ON p.id = m.product_id
       ORDER BY m.id DESC
       LIMIT ?`,
      limit,
    );
    return rows.map((row) => ({
      ...rowToMovement(row),
      productName: String(row.product_name),
      sku: String(row.product_sku),
      category: String(row.product_category) as Category,
    }));
  },

  /** All products with current inventory status (in-stock / low / out-of-stock). */
  async getStatuses(db: SQLiteDatabase): Promise<StockStatus[]> {
    const rows = await db.getAllAsync<Row>(
      `SELECT p.*, (p.stock * p.cost) AS stock_value
       FROM products p
       ORDER BY p.name COLLATE NOCASE ASC`,
    );
    return rows.map((row) => {
      const stock = Number(row.stock);
      const threshold = row.low_stock_threshold != null ? Number(row.low_stock_threshold) : 5;
      let status: StockStatus["status"];
      if (stock <= 0) status = "out-of-stock";
      else if (stock <= threshold) status = "low";
      else status = "in-stock";
      const p = rowToProduct(row);
      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        stock,
        lowStockThreshold: threshold,
        status,
        stockValue: Number(row.stock_value ?? 0),
      };
    });
  },

  /** Products at or below their low-stock threshold (incl. out-of-stock). */
  async listLowStock(db: SQLiteDatabase): Promise<StockStatus[]> {
    const all = await stockQueries.getStatuses(db);
    return all.filter((s) => s.status !== "in-stock");
  },

  /** Stock value + counts for dashboard summaries. */
  async getDashboardSummary(db: SQLiteDatabase) {
    const row = await db.getFirstAsync<Row>(
      `SELECT
         COALESCE(SUM(stock), 0) AS total_units,
         COALESCE(SUM(stock * cost), 0) AS stock_value,
         COALESCE(SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END), 0) AS out_of_stock,
         COALESCE(SUM(CASE WHEN stock > 0 AND stock <= low_stock_threshold THEN 1 ELSE 0 END), 0) AS low_stock
       FROM products`,
    );
    return {
      totalUnits: Number(row?.total_units ?? 0),
      stockValue: Number(row?.stock_value ?? 0),
      outOfStock: Number(row?.out_of_stock ?? 0),
      lowStock: Number(row?.low_stock ?? 0),
    };
  },
};

function rowToMovement(row: Row): StockMovement {
  return {
    id: Number(row.id),
    productId: Number(row.product_id),
    type: String(row.type) as StockMovementType,
    quantity: Number(row.quantity),
    balanceAfter: Number(row.balance_after),
    referenceId: row.reference_id != null ? Number(row.reference_id) : null,
    note: row.note != null ? String(row.note) : null,
    createdAt: row.created_at != null ? Number(row.created_at) : Number(row.id),
  };
}

/* ----------------------------------- Sales ---------------------------------- */

export const saleQueries = {
  async create(
    db: SQLiteDatabase,
    input: {
      lines: CartLine[];
      discount: number;
      paymentMethod: PaymentMethod;
    },
  ): Promise<number> {
    const subtotal = input.lines.reduce(
      (sum, line) => sum + line.price * line.quantity,
      0,
    );
    const discount = Math.max(0, Math.min(input.discount, subtotal));
    const total = subtotal - discount;
    let saleId = 0;

    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        "INSERT INTO sales (total, discount, payment_method, created_at) VALUES (?, ?, ?, ?)",
        total,
        discount,
        input.paymentMethod,
        Date.now(),
      );
      saleId = Number(result.lastInsertRowId);

      for (const line of input.lines) {
        await db.runAsync(
          `INSERT INTO sale_lines (sale_id, product_id, name, price, quantity)
           VALUES (?, ?, ?, ?, ?)`,
          saleId,
          line.productId,
          line.name,
          line.price,
          line.quantity,
        );
        await stockQueries.recordMovement(db, {
          productId: line.productId,
          type: "sale",
          delta: -line.quantity,
          referenceId: saleId,
          note: `Sale #${saleId}`,
        });
      }
    });

    return saleId;
  },

  async list(db: SQLiteDatabase, limit = 100): Promise<Sale[]> {
    const rows = await db.getAllAsync<Row>(
      "SELECT * FROM sales ORDER BY created_at DESC LIMIT ?",
      limit,
    );
    return rows.map(rowToSale);
  },

  /** Sales newest-first, each with its total item count (for history lists). */
  async listWithItemCounts(
    db: SQLiteDatabase,
    limit = 100,
  ): Promise<SaleListItem[]> {
    const rows = await db.getAllAsync<Row>(
      `SELECT s.*,
         COALESCE((SELECT SUM(quantity) FROM sale_lines sl WHERE sl.sale_id = s.id), 0) AS item_count
       FROM sales s
       ORDER BY s.created_at DESC
       LIMIT ?`,
      limit,
    );
    return rows.map((row) => ({ ...rowToSale(row), itemCount: Number(row.item_count) }));
  },

  async getById(db: SQLiteDatabase, id: number): Promise<SaleDetail | null> {
    const sale = await db.getFirstAsync<Row>("SELECT * FROM sales WHERE id = ?", id);
    if (!sale) return null;
    const lines = await db.getAllAsync<Row>(
      "SELECT * FROM sale_lines WHERE sale_id = ? ORDER BY id ASC",
      id,
    );
    return {
      ...rowToSale(sale),
      lines: lines.map(
        (line): SaleLine => ({
          productId: Number(line.product_id),
          name: String(line.name),
          price: Number(line.price),
          quantity: Number(line.quantity),
        }),
      ),
    };
  },

  /** Aggregate figures for sales that occurred on or after `since`. */
  async summary(
    db: SQLiteDatabase,
    since: number,
  ): Promise<{ count: number; revenue: number; itemsSold: number }> {
    const row = await db.getFirstAsync<Row>(
      `SELECT
         COUNT(*) AS count,
         COALESCE(SUM(total), 0) AS revenue,
         COALESCE((SELECT SUM(quantity) FROM sale_lines sl WHERE sl.sale_id IN
           (SELECT id FROM sales WHERE created_at >= ?)), 0) AS items_sold
       FROM sales WHERE created_at >= ?`,
      since,
      since,
    );
    return {
      count: Number(row?.count ?? 0),
      revenue: Number(row?.revenue ?? 0),
      itemsSold: Number(row?.items_sold ?? 0),
    };
  },
};

function rowToSale(row: Row): Sale {
  return {
    id: Number(row.id),
    total: Number(row.total),
    discount: Number(row.discount),
    paymentMethod: String(row.payment_method) as PaymentMethod,
    createdAt: Number(row.created_at),
  };
}

/* ---------------------------------- Settings --------------------------------- */

const SETTINGS_OPERATOR_NAME = "till.operator.name";

/** Derives the short receipt form of a name, e.g. "Tanaka Moyo" -> "Tanaka M.". */
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const [first, ...rest] = parts;
  if (rest.length === 0) return first;
  return `${first} ${rest.map((p) => `${p[0].toUpperCase()}.`).join(" ")}`;
}

export const settingsQueries = {
  async getOperator(db: SQLiteDatabase): Promise<TillOperator | null> {
    const row = await db.getFirstAsync<Row>(
      "SELECT value FROM settings WHERE key = ?",
      SETTINGS_OPERATOR_NAME,
    );
    const name = row?.value ? String(row.value) : "";
    if (!name) return null;
    return { name, shortName: shortName(name) };
  },

  async setOperator(db: SQLiteDatabase, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      SETTINGS_OPERATOR_NAME,
      trimmed,
    );
  },
};

/* ----------------------------------- Seed ----------------------------------- */

async function seedIfEmpty(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<Row>("SELECT COUNT(*) as count FROM products");
  const count = Number(row?.count ?? 0);
  if (count > 0) return;

  const seed = [
    { name: "iPhone 15 Pro 128GB", sku: "APL-IP15P", price: 1099, cost: 950, stock: 12, low: 3, category: "smartphone" },
    { name: "iPhone 14 128GB", sku: "APL-IP14", price: 799, cost: 680, stock: 2, low: 3, category: "smartphone" },
    { name: "Samsung Galaxy S24", sku: "SAM-S24", price: 899, cost: 760, stock: 10, low: 3, category: "smartphone" },
    { name: "AirPods Pro 2", sku: "AUD-AP2", price: 249, cost: 200, stock: 4, low: 5, category: "audio-device" },
    { name: "JBL Flip 6 Speaker", sku: "AUD-FLIP6", price: 129, cost: 95, stock: 8, low: 3, category: "audio-device" },
    { name: "Sony WH-1000XM5", sku: "AUD-XM5", price: 349, cost: 280, stock: 6, low: 2, category: "audio-device" },
    { name: "USB-C Wall Charger 30W", sku: "ACC-USB30", price: 29, cost: 12, stock: 40, low: 10, category: "accessory" },
    { name: "Tempered Glass Screen Protector", sku: "ACC-TGSP", price: 15, cost: 3, stock: 100, low: 20, category: "accessory" },
    { name: "Braided USB-C Cable 1m", sku: "ACC-CBL1M", price: 19, cost: 5, stock: 0, low: 10, category: "accessory" },
  ];

  await db.withTransactionAsync(async () => {
    for (const item of seed) {
      const result = await db.runAsync(
        `INSERT INTO products
           (name, sku, price, cost, stock, low_stock_threshold, category, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        item.name,
        item.sku,
        item.price,
        item.cost,
        item.stock,
        item.low,
        item.category,
        Date.now(),
      );
      if (item.stock > 0) {
        await db.runAsync(
          `INSERT INTO stock_movements
             (product_id, type, quantity, balance_after, reference_id, note, created_at)
           VALUES (?, 'restock', ?, ?, NULL, 'Initial stock', ?)`,
          Number(result.lastInsertRowId),
          item.stock,
          item.stock,
          Date.now(),
        );
      }
    }
  });
}
