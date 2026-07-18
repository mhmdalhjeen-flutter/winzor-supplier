import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PwaInstallCard from '../components/pwa/PwaInstallCard';
import PwaShortcutsTutorial from '../components/pwa/PwaShortcutsTutorial';
import {
  isShortcutsTutorialSeen,
  isStandaloneDisplayMode,
  markShortcutsTutorialSeen,
  recordInstallDismissed,
  recordPwaSessionLaunch,
  shouldShowInstallPrompt,
} from '../pwa/pwaStorage';

const PwaInstallContext = createContext(null);
const AUTO_SHOW_DELAY_MS = 4500;

export function PwaInstallProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  useEffect(() => {
    recordPwaSessionLaunch();
  }, []);

  useEffect(() => {
    if (isStandaloneDisplayMode()) return undefined;

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setCardOpen(false);
      setManualOpen(false);
      if (!isShortcutsTutorialSeen()) {
        markShortcutsTutorialSeen();
        window.setTimeout(() => setTutorialOpen(true), 700);
      }
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!deferredPrompt || isStandaloneDisplayMode() || manualOpen) return undefined;
    if (!shouldShowInstallPrompt()) return undefined;

    const timer = window.setTimeout(() => {
      if (shouldShowInstallPrompt() && !isStandaloneDisplayMode()) {
        setCardOpen(true);
      }
    }, AUTO_SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [deferredPrompt, manualOpen]);

  const canInstall = Boolean(deferredPrompt) && !isStandaloneDisplayMode();

  const dismissLater = useCallback(() => {
    recordInstallDismissed();
    setCardOpen(false);
    setManualOpen(false);
  }, []);

  const openInstallCard = useCallback(() => {
    if (!canInstall) return;
    setManualOpen(true);
    setCardOpen(true);
  }, [canInstall]);

  const closeInstallCard = useCallback(() => {
    setCardOpen(false);
    setManualOpen(false);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === 'accepted') {
        setCardOpen(false);
        setManualOpen(false);
      }
    } catch {
      /* cancelled or blocked */
    } finally {
      setInstalling(false);
    }
  }, [deferredPrompt]);

  const value = useMemo(
    () => ({
      canInstall,
      installing,
      install,
      dismissLater,
      openInstallCard,
    }),
    [canInstall, installing, install, dismissLater, openInstallCard],
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
      {cardOpen && canInstall && (
        <PwaInstallCard
          installing={installing}
          onInstall={install}
          onLater={dismissLater}
          onClose={manualOpen ? closeInstallCard : dismissLater}
        />
      )}
      {tutorialOpen && (
        <PwaShortcutsTutorial onClose={() => setTutorialOpen(false)} />
      )}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) {
    throw new Error('usePwaInstall must be used within PwaInstallProvider');
  }
  return ctx;
}

export default PwaInstallContext;
