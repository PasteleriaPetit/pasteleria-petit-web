import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext();
const LS_KEY = "cart_v3";
export const MAX_ITEM_QTY = 5; // Límite máximo de unidades por producto

const sameOptions = (a, b) => JSON.stringify(a || {}) === JSON.stringify(b || {});

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product) => {
    // product: { id, title, price, img, options? }
    setCart((prev) => {
      const idx = prev.findIndex((it) => it.id === product.id && sameOptions(it.options, product.options));
      if (idx >= 0) {
        const clone = [...prev];
        const newQty = Math.min(MAX_ITEM_QTY, clone[idx].qty + (product.qty || 1));
        clone[idx] = { ...clone[idx], qty: newQty };
        return clone;
      }
      return [...prev, { ...product, qty: Math.min(MAX_ITEM_QTY, product.qty || 1) }];
    });
  };

  const removeFromCart = (id, options) =>
    setCart((prev) => prev.filter((it) => !(it.id === id && sameOptions(it.options, options))));

  const setQuantity = (id, options, qty) =>
    setCart((prev) =>
      prev.map((it) =>
        it.id === id && sameOptions(it.options, options)
          ? { ...it, qty: Math.max(1, Math.min(MAX_ITEM_QTY, Number(qty) || 1)) }
          : it
      )
    );

  const increase = (id, options) => {
    const current = cart.find((i) => i.id === id && sameOptions(i.options, options))?.qty || 1;
    if (current < MAX_ITEM_QTY) {
      setQuantity(id, options, current + 1);
    }
  };

  const decrease = (id, options) => {
    const current = cart.find((i) => i.id === id && sameOptions(i.options, options))?.qty || 1;
    setQuantity(id, options, current - 1);
  };

  const clearCart = () => setCart([]);

  const discount = 0;
  const taxes = 0;

  const subtotal = useMemo(
    () => cart.reduce((acc, i) => acc + Number(i.price || 0) * Number(i.qty || 0), 0),
    [cart]
  );

  const total = subtotal - discount + taxes;

  const itemCount = useMemo(() => cart.reduce((acc, i) => acc + (Number(i.qty) || 0), 0), [cart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        setQuantity,
        increase,
        decrease,
        subtotal,
        discount,
        taxes,
        total,
        itemCount,
        maxItemQty: MAX_ITEM_QTY,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);