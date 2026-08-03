import { Navigate } from 'react-router-dom';
import { getStoredUser } from '../utils/safeStorage';

/** Offers management moved to متجري (MyStore). */
export default function OffersRedirect() {
  const user = getStoredUser({});
  const baseRoute = user?.role === 'supplier' ? '/supplier' : '/store';
  return <Navigate to={`${baseRoute}/my-store`} replace />;
}
