import { Navigate } from 'react-router-dom';

import useStoreOwnerPermissions from '../hooks/useStoreOwnerPermissions';

export default function StoreFeatureRoute({ feature, children }) {
  const { permissions, isStoreOwner } = useStoreOwnerPermissions();

  if (!isStoreOwner) {
    return children;
  }

  if (!permissions[feature]) {
    return <Navigate to="/not-authorized" replace />;
  }

  return children;
}
