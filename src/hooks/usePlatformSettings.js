import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { queryKeys } from '../lib/queryClient';

const DEFAULTS = {
  features: {
    referralProgram: true,
    storeCompetitions: true,
    marketplace: true,
    draws: true,
  },
  referralRewardPoints: 3,
  verification: {
    enforced: false,
    emailAvailable: false,
    phoneAvailable: false,
  },
};

export function usePlatformSettings() {
  return useQuery({
    queryKey: queryKeys.platformSettings,
    queryFn: async () => {
      try {
        const { data } = await api.get('/settings/public');
        return { ...DEFAULTS, ...data.settings };
      } catch {
        return DEFAULTS;
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export default usePlatformSettings;
