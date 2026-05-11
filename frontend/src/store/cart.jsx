import React, { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "fs_cart_v1";

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item) => {
    setItems((prev) => {
      const key = `${item.product_id}-${item.weight}`;
      const existing = prev.find((i) => `${i.product_id}-${i.weight}` === key);
      if (existing) {
        return prev.map((i) =>
          `${i.product_id}-${i.weight}` === key ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i
        );
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
    setOpen(true);
  };

  const updateQty = (key, qty) => {
    if (qty <= 0) return removeItem(key);
    setItems((prev) =>
      prev.map((i) => (`${i.product_id}-${i.weight}` === key ? { ...i, quantity: qty } : i))
    );
  };

  const removeItem = (key) =>
    setItems((prev) => prev.filter((i) => `${i.product_id}-${i.weight}` !== key));

  const clear = () => setItems([]);

  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, updateQty, removeItem, clear, subtotal, count, open, setOpen }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
