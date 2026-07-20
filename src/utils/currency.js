export const DEFAULT_CURRENCY = 'ILS';

export const CURRENCY_OPTIONS = [
  { code: 'ILS', label: '₪ شيكل', symbol: '₪' },
  { code: 'JOD', label: 'JD دينار', symbol: 'JD' },
  { code: 'USD', label: '$ دولار', symbol: '$' },
];

export function normalizeCurrency(code) {
  const raw = String(code || DEFAULT_CURRENCY).trim().toUpperCase();
  return CURRENCY_OPTIONS.some((item) => item.code === raw) ? raw : DEFAULT_CURRENCY;
}

export function getCurrencySymbol(code) {
  return CURRENCY_OPTIONS.find((item) => item.code === normalizeCurrency(code))?.symbol || '₪';
}

export function formatPrice(amount, currency = DEFAULT_CURRENCY) {
  const symbol = getCurrencySymbol(currency);
  if (amount == null || amount === '') return `${symbol} 0`;
  const num = Number(amount);
  const value = Number.isFinite(num)
    ? num.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : amount;
  return `${symbol} ${value}`;
}

export function formatPriceWithUnit(amount, currency, priceUnit) {
  const base = formatPrice(amount, currency);
  const unit = String(priceUnit || '').trim();
  return unit ? `${base} / ${unit}` : base;
}

export function formatListingPrice(listing) {
  if (!listing) return formatPrice(0);
  return formatPriceWithUnit(listing.price, listing.currency, listing.priceUnit);
}
