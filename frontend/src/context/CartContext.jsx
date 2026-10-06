import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("foodie_cart"));
      return Array.isArray(stored) ? stored.filter((item) =>
        item && Number.isInteger(item.id) && Number.isInteger(item.qty) &&
        item.qty >= 1 && item.qty <= 100 && Number.isFinite(Number(item.price))
      ) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("foodie_cart", JSON.stringify(items));
  }, [items]);

  const addToCart = (food) =>
    setItems((prev) => {
      const found = prev.find((i) => i.id === food.id);
      if (found) return prev.map((i) => (i.id === food.id ? { ...i, qty: Math.min(100, i.qty + 1) } : i));
      return [...prev, { id: food.id, name: food.name, price: Number(food.price), image_url: food.image_url, qty: 1 }];
    });
  const updateQty = (id, qty) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(100, Math.trunc(Number(qty)) || 1)) } : i)));
  const removeFromCart = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const clearCart = () => setItems([]);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, updateQty, removeFromCart, clearCart, count, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
