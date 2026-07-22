import api from "./api";

export const getProducts = () => api.get("/products");

export const getMyProducts = (all = true) =>
  api.get(`/products/my${all ? "?all=true" : ""}`);

export const createProduct = (data) =>
  api.post("/products", data);

export const deleteProduct = (id) =>
  api.delete(`/products/${id}`);

export const toggleProductActive = (id) =>
  api.patch(`/products/${id}/toggle-active`);
