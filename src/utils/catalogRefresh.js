import { queryKeys } from "../lib/queryClient";

/** Invalidate all catalog-related queries after create/edit/delete. */
export function invalidateCatalog(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.myProducts });
  queryClient.invalidateQueries({ queryKey: queryKeys.myOffersAll });
  queryClient.invalidateQueries({ queryKey: queryKeys.myOffers });
}
