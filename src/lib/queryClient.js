import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const queryKeys = {
  categoryTree: (type = "store") => ["categories", "tree", type],
  regionTree: ["regions", "tree"],
  myProducts: ["products", "my"],
  myOffers: ["offers", "my"],
  myOffersAll: ["offers", "my", "all"],
  warehouses: ["stores", "warehouses"],
  notifications: ["notifications"],
  storeOrders: ["orders", "store"],
  storeCart: (base) => ["cart", base],
  storeMyOrders: ["orders", "my"],
  me: ["me"],
  platformSettings: ["platformSettings"],
};
