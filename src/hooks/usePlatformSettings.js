import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { queryKeys } from '../lib/queryClient';

const DEFAULTS = {
  features: {
    referralProgram: true,
    storeCompetitions: true,
    marketplace: true,
    draws: true,
    wheel: true,
  },
  referralRewardPoints: 3,
  wheel: {
    enabled: true,
    spinCost: 5,
    placements: { header: true, userCenter: true, inventory: true },
  },
};

export function usePlatformSettings() {
  return useQuery({
    queryKey: queryKeys.platformSettings,
    queryFn: async () => {
      const { data } = await api.get('/settings/public');
      return { ...DEFAULTS, ...data.settings };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export default usePlatformSettings;
