/**
 * Customer WinGold origin used to open the public store page.
 * Prefer VITE_CUSTOMER_APP_URL. Dev defaults to the customer Vite port.
 * Production fallback matches the existing customer SITE_ORIGIN / CUSTOMER_APP_URL.
 */
function resolveCustomerAppOrigin() {
  const fromEnv = String(import.meta.env?.VITE_CUSTOMER_APP_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (import.meta.env?.DEV) return "http://localhost:5173";
  return "https://wingolgmoll.com";
}

export function buildCustomerStoreUrl(storeId) {
  const id = storeId != null ? String(storeId).trim() : "";
  if (!id) return null;
  return `${resolveCustomerAppOrigin()}/store/${encodeURIComponent(id)}`;
}
