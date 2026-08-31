import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { CartLine, Category } from "@/lib/types";

type AddInput = {
  productId: number;
  name: string;
  price: number;
  stock: number;
  category: Category;
  quantity?: number;
};

type CartResult = { ok: boolean; reason?: "out-of-stock" | "max-stock" };

type CartContextType = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  add: (input: AddInput) => CartResult;
  addOne: (line: CartLine) => CartResult;
  setQuantity: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  isEmpty: boolean;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const add = useCallback((input: AddInput): CartResult => {
    const quantity = input.quantity ?? 1;
    let result: CartResult = { ok: true };

    setLines((prev) => {
      const existing = prev.find((l) => l.productId === input.productId);

      if (input.stock <= 0) {
        result = { ok: false, reason: "out-of-stock" };
        return prev;
      }

      if (existing) {
        const nextQty = existing.quantity + quantity;
        if (nextQty > existing.stock) {
          result = { ok: false, reason: "max-stock" };
          return prev;
        }
        return prev.map((l) =>
          l.productId === input.productId ? { ...l, quantity: nextQty } : l,
        );
      }

      return [
        ...prev,
        {
          productId: input.productId,
          name: input.name,
          price: input.price,
          quantity,
          stock: input.stock,
          category: input.category,
        },
      ];
    });

    return result;
  }, []);

  const addOne = useCallback((line: CartLine): CartResult => {
    let result: CartResult = { ok: true };

    setLines((prev) => {
      const existing = prev.find((l) => l.productId === line.productId);

      if (line.stock <= 0) {
        result = { ok: false, reason: "out-of-stock" };
        return prev;
      }

      if (existing) {
        const nextQty = existing.quantity + 1;
        if (nextQty > existing.stock) {
          result = { ok: false, reason: "max-stock" };
          return prev;
        }
        return prev.map((l) =>
          l.productId === line.productId ? { ...l, quantity: nextQty } : l,
        );
      }

      return [
        ...prev,
        {
          productId: line.productId,
          name: line.name,
          price: line.price,
          quantity: 1,
          stock: line.stock,
          category: line.category,
        },
      ];
    });

    return result;
  }, []);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    setLines((prev) => {
      if (quantity <= 0) {
        return prev.filter((line) => line.productId !== productId);
      }
      return prev.map((line) => {
        if (line.productId !== productId) return line;
        const capped = Math.min(quantity, line.stock);
        return { ...line, quantity: capped };
      });
    });
  }, []);

  const remove = useCallback((productId: number) => {
    setLines((prev) => prev.filter((line) => line.productId !== productId));
  }, []);

  const clear = useCallback(() => {
    setLines([]);
  }, []);

  const { itemCount, subtotal } = useMemo(() => {
    let count = 0;
    let sum = 0;
    for (const line of lines) {
      count += line.quantity;
      sum += line.quantity * line.price;
    }
    return { itemCount: count, subtotal: sum };
  }, [lines]);

  const isEmpty = lines.length === 0;

  const value = useMemo(
    () => ({
      lines,
      itemCount,
      subtotal,
      add,
      addOne,
      setQuantity,
      remove,
      clear,
      isEmpty,
    }),
    [lines, itemCount, subtotal, add, addOne, setQuantity, remove, clear, isEmpty],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
