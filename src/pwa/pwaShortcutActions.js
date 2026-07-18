export const PWA_ACTION_PRODUCT = 'add-product';
export const PWA_ACTION_OFFER = 'add-offer';
export const PWA_TAB_PARAM = 'pwaTab';
export const PENDING_ACTION_KEY = 'trader_pwa_pending_action';

export function setPendingPwaAction(action) {
  try {
    sessionStorage.setItem(PENDING_ACTION_KEY, action);
  } catch {
    /* ignore */
  }
}

export function consumePendingPwaAction() {
  try {
    const action = sessionStorage.getItem(PENDING_ACTION_KEY);
    sessionStorage.removeItem(PENDING_ACTION_KEY);
    return action;
  } catch {
    return null;
  }
}

function resolveBaseRoute(role) {
  return role === 'supplier' ? '/supplier' : '/store';
}

export function navigateToAddTab(navigate, role, tab) {
  const baseRoute = resolveBaseRoute(role);
  navigate(`${baseRoute}/add-product-offer?${PWA_TAB_PARAM}=${tab}`, { replace: true });
}

/** After login — open the pending add-product/add-offer shortcut. */
export function completePendingPwaAction(navigate, role) {
  const action = consumePendingPwaAction();
  if (action === PWA_ACTION_PRODUCT) {
    navigateToAddTab(navigate, role, 'product');
    return true;
  }
  if (action === PWA_ACTION_OFFER) {
    navigateToAddTab(navigate, role, 'offer');
    return true;
  }
  return false;
}

export function openAddShortcut(navigate, isAuthed, role, action) {
  const tab = action === PWA_ACTION_OFFER ? 'offer' : 'product';
  if (!isAuthed) {
    setPendingPwaAction(action);
    navigate('/login');
    return;
  }
  navigateToAddTab(navigate, role, tab);
}
