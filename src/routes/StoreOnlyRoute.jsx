/** Store-only pages rely on backend feature flags — no client-side role gating. */

export default function StoreOnlyRoute({ children }) {

  return children;

}

