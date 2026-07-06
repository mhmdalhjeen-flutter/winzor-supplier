/**
 * Normalize list payloads whether the API returns a raw array or a wrapper object.
 */
export function unwrapList(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const candidates = keys.length
    ? keys
    : ["items", "data", "list", "results", "offers", "products", "orders", "stores", "warehouses"];

  for (const key of candidates) {
    if (Array.isArray(payload[key])) return payload[key];
  }

  return [];
}
