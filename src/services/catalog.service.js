import api from "./api";

export const fetchRegionTree = () =>
  api.get("/regions", { params: { tree: "true" } }).then((res) => (Array.isArray(res.data) ? res.data : []));

export const fetchCategoryTree = (type = "store") =>
  api.get("/categories/tree", { params: { type } }).then((res) => (Array.isArray(res.data) ? res.data : []));
