export const CARD_QTY_STEP = 5;

export function parseCardQuantity(value) {
  if (value === '' || value == null) return 0;
  const num = parseInt(value, 10);
  if (!Number.isFinite(num) || num < 0) return 0;
  return num;
}

export function stepCardQuantity(current, direction) {
  const delta = direction < 0 ? -CARD_QTY_STEP : CARD_QTY_STEP;
  return Math.max(0, parseCardQuantity(current) + delta);
}

export function cardQuantityInputValue(quantity, focused) {
  const qty = parseCardQuantity(quantity);
  if (focused && qty === 0) return '';
  return String(qty);
}
