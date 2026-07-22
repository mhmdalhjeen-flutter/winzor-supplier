import { queryKeys } from "../lib/queryClient";

/** Invalidate all catalog-related queries after create/edit/delete/toggle. */
export function invalidateCatalog(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.myProducts });
  queryClient.invalidateQueries({ queryKey: queryKeys.myOffersAll });
  queryClient.invalidateQueries({ queryKey: queryKeys.myOffers });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboardOffers });
}
