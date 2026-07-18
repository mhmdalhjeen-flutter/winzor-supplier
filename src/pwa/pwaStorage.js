const INSTALL_STATE_KEY = 'trader_pwa_install_state_v1';
const TUTORIAL_SEEN_KEY = 'trader_pwa_shortcuts_tutorial_v1';
const SESSION_COUNTED_KEY = 'trader_pwa_session_counted';

function readInstallState() {
  try {
    const raw = localStorage.getItem(INSTALL_STATE_KEY);
    if (!raw) return { dismissedOn: null, launchesSinceDismiss: 0 };
    const parsed = JSON.parse(raw);
    return {
      dismissedOn: parsed.dismissedOn ?? null,
      launchesSinceDismiss: Number(parsed.launchesSinceDismiss) || 0,
    };
  } catch {
    return { dismissedOn: null, launchesSinceDismiss: 0 };
  }
}

function writeInstallState(state) {
  try {
    localStorage.setItem(INSTALL_STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function isStandaloneDisplayMode() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.matchMedia('(display-mode: minimal-ui)').matches
    || window.navigator.standalone === true
  );
}

export function recordPwaSessionLaunch() {
  if (typeof window === 'undefined') return;
  try {
    if (sessionStorage.getItem(SESSION_COUNTED_KEY) === '1') return;
    sessionStorage.setItem(SESSION_COUNTED_KEY, '1');
    const state = readInstallState();
    if (!state.dismissedOn) return;
    state.launchesSinceDismiss += 1;
    writeInstallState(state);
  } catch {
    /* ignore */
  }
}

export function recordInstallDismissed() {
  writeInstallState({ dismissedOn: todayKey(), launchesSinceDismiss: 0 });
}

export function shouldShowInstallPrompt() {
  if (isStandaloneDisplayMode()) return false;
  const state = readInstallState();
  if (!state.dismissedOn) return true;
  if (state.dismissedOn === todayKey()) return false;
  const dismissedMs = new Date(`${state.dismissedOn}T00:00:00`).getTime();
  const daysSince = Math.floor((Date.now() - dismissedMs) / 86_400_000);
  if (daysSince >= 7) return true;
  if (state.launchesSinceDismiss >= 5) return true;
  return false;
}

export function isShortcutsTutorialSeen() {
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markShortcutsTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
}
