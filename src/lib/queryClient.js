import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      networkMode: "offlineFirst",
      retry: 1,
    },
  },
});

export const queryKeys = {
  categoryTree: (type = "store") => ["categories", "tree", type],
  regionTree: ["regions", "tree"],
  myStore: ["store", "my"],
  myProducts: ["products", "my"],
  myOffers: ["offers", "my"],
  myOffersAll: ["offers", "my", "all"],
  dashboardStats: ["dashboard", "stats"],
  dashboardOffers: ["dashboard", "offers"],
  warehouses: ["stores", "warehouses"],
  notifications: ["notifications"],
  storeOrders: ["orders", "store"],
  storeCart: (base) => ["cart", base],
  storeMyOrders: ["orders", "my"],
  me: ["me"],
  platformSettings: ["platformSettings"],
};
