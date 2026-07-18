import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getStoredUser } from '../../utils/safeStorage';
import {
  openAddShortcut,
  PWA_ACTION_OFFER,
  PWA_ACTION_PRODUCT,
} from '../../pwa/pwaShortcutActions';

/** Handles manifest shortcut query params without changing routes. */
export default function PwaShortcutHandler() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const action = searchParams.get('pwaAction');
    if (!action) return;

    if (action !== PWA_ACTION_PRODUCT && action !== PWA_ACTION_OFFER) return;

    handled.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete('pwaAction');
    setSearchParams(next, { replace: true });

    const user = getStoredUser(null);
    const isAuthed = Boolean(localStorage.getItem('token'));
    openAddShortcut(navigate, isAuthed, user?.role, action);
  }, [searchParams, setSearchParams, navigate]);

  return null;
}
