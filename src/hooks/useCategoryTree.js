import { useQuery } from "@tanstack/react-query";
import { fetchCategoryTree } from "../services/catalog.service";
import { queryKeys } from "../lib/queryClient";

export function useCategoryTree(type = "store") {
  const { data: tree = [], isLoading: loading, error, refetch: reload } = useQuery({
    queryKey: queryKeys.categoryTree(type),
    queryFn: () => fetchCategoryTree(type),
    staleTime: 60 * 1000,
  });

  return { tree, loading, error, reload };
}
