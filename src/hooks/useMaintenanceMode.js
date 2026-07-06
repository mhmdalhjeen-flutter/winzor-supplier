import { usePlatformSettings } from './usePlatformSettings';

const DEFAULT = {
  enabled: false,
  message: 'الموقع تحت الصيانة حالياً. نعمل على تحسين تجربتكم ونعود قريباً.',
};

export default function useMaintenanceMode() {
  const { data: settings } = usePlatformSettings();
  const mm = settings?.maintenanceMode || DEFAULT;

  return {
    maintenance: {
      enabled: mm.enabled === true,
      message: mm.message || DEFAULT.message,
    },
  };
}

export function redirectToMaintenanceIfNeeded(error) {
  const data = error?.response?.data;
  if (error?.response?.status === 503 && data?.code === 'MAINTENANCE_MODE') {
    if (!window.location.pathname.includes('/maintenance')) {
      window.location.href = '/maintenance';
    }
    return true;
  }
  return false;
}
