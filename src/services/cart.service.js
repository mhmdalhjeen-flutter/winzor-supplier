import api from "./api";

export const getCart = () => api.get("/cart");

export const addToCart = (item) =>
  api.post("/cart", item);

export const removeFromCart = (id) =>
  api.delete(`/cart/${id}`);