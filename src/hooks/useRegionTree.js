import { useQuery } from "@tanstack/react-query";
import { fetchRegionTree } from "../services/catalog.service";
import { queryKeys } from "../lib/queryClient";

export function useRegionTree() {
  const { data: tree = [], isLoading: loading, error, refetch: reload } = useQuery({
    queryKey: queryKeys.regionTree,
    queryFn: () => fetchRegionTree(),
    staleTime: 60 * 1000,
  });

  return { tree, loading, error, reload };
}
