import { createContext, useContext, useState } from "react";

const StoreContext = createContext();

export function StoreProvider({ children }) {
  const [products, setProducts] = useState([]);

  // ➕ إضافة منتج
  const addProduct = (product) => {
    setProducts((prev) => [
      {
        id: Date.now(),
        ...product,
      },
      ...prev,
    ]);
  };

  // 🗑 حذف منتج
  const deleteProduct = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <StoreContext.Provider value={{ products, addProduct, deleteProduct }}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => useContext(StoreContext);