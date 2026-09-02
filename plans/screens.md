# Smart Switch Mobile — Screens

This document describes every screen in the **native** Android POS app (`apps/native`).

It focuses on **layout, feel, spacing and function** — how each screen is structured,
how elements are arranged and spaced, and what the screen does. It intentionally avoids
design specifics (colors, typography, visual decoration), which are left to the designer.

The app uses **Expo Router**: files under `apps/native/app/` map to routes. Screens are
grouped under a bottom-tab shell (`(tabs)`) with additional pushed/modale screens on top.
The POS works fully **offline** against a local SQLite database.

---

## Route map

```
app/
├── _layout.tsx           Root layout — providers + root Stack
├── +not-found.tsx        404 fallback
└── (tabs)/               Bottom tab shell (header + tab bar)
    ├── _layout.tsx       Tab navigator + cart badge in the header
    ├── index.tsx         Point of Sale (products + cart summary bar)
    ├── sales.tsx         Sales history
    └── products.tsx      Product management

Planned pushed/modale screens (not yet built):
    cart.tsx              Cart review
    checkout.tsx          Checkout / payment
    sale/[id].tsx         Receipt / sale detail
    product-form.tsx      Add / edit product
    stock/[id].tsx        Stock management for a product
```

> Screens marked **planned** are not yet implemented. Their data logic lives in
> `lib/db`, `lib/pricing`, `lib/pos` and the contexts in `contexts/`.

---

## Shared structural conventions

These apply to every screen unless stated otherwise:

- **Safe areas**: top/bottom system insets are respected so content is never hidden behind
  the status bar, gesture bar or tab bar.
- **Header**: each tab shows a title in the top-left of the app bar, tinted to match the
  active theme. A back affordance appears on pushed screens.
- **Tab bar**: three fixed destinations at the bottom — Point of Sale, Sales, Products.
  Each shows an icon; the active tab is highlighted.
- **Spacing rhythm**: screens use a consistent outer padding, and vertical gaps between
  groups of content are larger than the gaps between elements within a group.
- **Empty & loading states**: while data loads a centered indicator is shown; when a list
  has no items a centered message with an icon is shown in place of the list.
- **Scrolling**: lists scroll independently; pinned bars (e.g. a cart summary) stay visible
  while the list scrolls beneath them.

---

## Screens

### 1. Root layout — `_layout.tsx` (implemented)

Not a visible screen — the provider stack that wraps the whole app.

**Function:**
- Mounts `GestureHandlerRootView`, `KeyboardProvider`, `AppThemeProvider`,
  `DatabaseProvider`, `CartProvider`, `HeroUINativeProvider`.
- Declares the root `Stack` and the initial route `(tabs)`.
- Exposes the theme (light/dark) to all screens via `AppThemeContext`.

**Layout / feel:** no UI of its own; it fills the screen and delegates everything to the
active screen. Ensures the offline database and cart are available everywhere.

---

### 2. Point of Sale — `(tabs)/index.tsx` (implemented core)

The main everyday screen. A cashier finds products and adds them to the cart.

**Layout (top to bottom):**
1. **Search row** — a search input occupying the full width at the top, preceded by a
   search icon on the left. Sits within the screen's horizontal padding.
2. **Category filter row** — a wrapping row of filter chips directly below the search,
   starting with an "All" chip followed by one chip per category. Chips wrap to new lines
   when they exceed the width.
3. **Product grid** — a two-column scrollable grid filling the remaining space. Each card
   has compact padding, a category icon and an "Out" marker in its top corners, followed by
   the product name, SKU and price stacked vertically.
4. **Cart summary bar** — when the cart is non-empty, a pinned bar docked to the bottom
   edge. It contains a left-aligned item count and a right-aligned running subtotal on one
   row, with a full-width "View Cart" button below.

**Feel / function:**
- On first open, a centered indicator appears while the local database opens.
- Tapping the search input filters products live by name or SKU.
- Tapping a category chip filters the grid to that category; tapping the active chip again
  clears the filter.
- Tapping an in-stock product adds one unit to the cart; out-of-stock items are
  non-interactive and slightly dimmed.
- The header shows a cart badge with the current item count whenever the cart is non-empty.
- When the grid is empty a centered "no products found" message is shown.

**Data:** `productQueries.search` / `productQueries.listActive`, `CartContext`.

---

### 3. Sales history — `(tabs)/sales.tsx` (placeholder, planned)

Lists completed sales and shows totals.

**Planned layout:**
1. **Summary block** at the top: a set of figures in a horizontally arranged group —
   revenue and transaction count (and items sold) — read left-to-right.
2. **Sale list** below, newest first. Each row shows the receipt id, formatted date, item
   count, payment method and total.
3. A **payment-method filter** (Cash / EcoCash / OneMoney) to narrow the list.

**Feel / function:**
- Rows are tappable → open the receipt detail screen.
- Summary figures update from the same data as the list.
- Loading and empty states follow the shared conventions.

**Data:** `saleQueries.list`, `saleQueries.summary`.

---

### 4. Product management — `(tabs)/products.tsx` (placeholder, planned)

Manages the catalog.

**Planned layout:**
1. **Header action** on the right: an "add" affordance to create a new product.
2. **Search + category filter** row near the top (same pattern as Point of Sale).
3. **Product list** filling the screen. Each row shows name, SKU, price/cost, on-hand
   stock, and a stock status (in-stock / low / out-of-stock).
4. Optional **stock overview** section: totals for units on hand, stock value, and counts
   of low and out-of-stock items.

**Feel / function:**
- "Add" opens the product form in a new product mode.
- Row actions: edit (→ product form), activate/deactivate, and open stock management.
- Low-stock rows stand apart so supply can be managed quickly.

**Data:** `productQueries`, `stockQueries`.

---

## Planned detail screens

### 5. Cart review — `cart.tsx`

Reviews the current cart before payment.

**Planned layout:**
1. A scrollable **line list**. Each row: product name and unit price on the left; a
   quantity stepper (– / +) and the running line total on the right.
2. A **totals footer**: subtotal, discount, then a larger total, followed by a full-width
   "Checkout" button. A "clear cart" affordance is available.

**Feel / function:**
- The stepper is capped by available stock; the minus button removes the line at zero.
- Removing a line updates totals immediately.
- "Checkout" proceeds to the payment screen.

**Data:** `CartContext`.

---

### 6. Checkout — `checkout.tsx`

Completes the sale with payment.

**Planned layout:**
1. **Discount** entry at the top.
2. **Payment method** selection as a set of choices: Cash, EcoCash, OneMoney.
3. When Cash is selected, an **amount tendered** input with a computed **change due**
   figure shown nearby.
4. A summary of the total and a full-width **confirm** button.

**Feel / function:**
- Discount is clamped so the total never goes below zero.
- Confirmation writes the sale, records stock movements and decrements inventory in a
  single atomic step; on failure the reason is shown and the cart is preserved.
- On success the cart clears and the user lands on the receipt.

**Data:** `checkout()` in `lib/pos.ts`, `computeTotals`, `computeChange`.

---

### 7. Receipt / sale detail — `sale/[id].tsx`

Shows a completed sale.

**Planned layout:**
1. **Header info**: receipt id, date, payment method.
2. **Line items** list: each line with name, unit price, quantity and line total.
3. **Totals footer**: discount (if any) and the final total.
4. An optional set of actions (e.g. print/share, new sale).

**Feel / function:** read-only presentation of a finished transaction; actions allow
re-using the flow after viewing.

**Data:** `saleQueries.getById`.

---

### 8. Product form — `product-form.tsx`

Add or edit a product.

**Planned layout:**
- A **modal** presented over the current screen (quick to dismiss).
- A vertical **form** of labeled fields: name, SKU, category, price, cost, opening/current
  stock, low-stock threshold, and active toggle.
- **Save** and **cancel** actions at the bottom.

**Feel / function:**
- SKU uniqueness is validated before saving.
- Create records an "initial stock" movement for the opening quantity.
- Edit only updates product attributes; stock changes are made via the stock screen so the
  ledger stays authoritative.

**Data:** `productQueries.create` / `productQueries.update`, `findSkuConflict`.

---

### 9. Stock management — `stock/[id].tsx`

Per-product inventory operations.

**Planned layout:**
1. **Current stock** figure at the top, with the low-stock threshold and stock value.
2. A set of **adjustment actions**: add stock (restock), remove stock (loss), manual count
   correction (adjust), and restocking a return (sale-return). Each asks for a quantity.
3. A **movement ledger** list below, newest first: type, quantity change, balance after,
   and timestamp.

**Feel / function:**
- Adjustments respect available stock (no negative balances).
- The reorder point can be edited and drives low-stock status.
- Every change is recorded so the ledger gives a full history.

**Data:** `stockQueries`, `lib/pos.ts` stock service.

---

## Data & services reference (non-UI, used by the screens)

| Layer | File | Notes |
|-------|------|-------|
| Types | `lib/types.ts` | Product, CartLine, Sale, StockMovement, StockStatus, categories & payment methods |
| Schema | `lib/db/schema.ts` | `products`, `sales`, `sale_lines`, `stock_movements` (+ indexes) |
| Database | `lib/db/database.ts` | `openDb`, `productQueries`, `saleQueries`, `stockQueries`, seeding |
| Pricing | `lib/pricing.ts` | `computeTotals`, `computeChange`, `findStockConflict`, payment validation |
| POS service | `lib/pos.ts` | `checkout`, `adjustStock`, `restockProduct`, `removeStock`, `setReorderPoint` |
| Formatting | `lib/format.ts` | currency/date, category & payment metadata |
| Database context | `contexts/database-context.tsx` | exposes the opened DB + readiness |
| Cart context | `contexts/cart-context.tsx` | stock-aware cart state + totals |

---

## Domain constants

- **Categories**: `smartphone` (Smartphones), `audio-device` (Audio Devices),
  `accessory` (Accessories).
- **Payment methods**: `cash` (Cash), `ecocash` (EcoCash), `onemoney` (OneMoney).
- **Stock movement types**: `restock`, `sale`, `sale-return`, `loss`, `adjust`.
- **Currency**: USD (`Intl.NumberFormat`).