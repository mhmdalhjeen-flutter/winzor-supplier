/** Display-only helpers — pricing calculations live in backend pricing.service.js */

export const OFFER_TYPE_OPTIONS = [
  { value: 'discount', label: '\u062E\u0635\u0645 \u0628\u0627\u0644\u0646\u0633\u0628\u0629 \u0627\u0644\u0645\u0626\u0648\u064A\u0629' },
  { value: 'fixed_price', label: '\u0633\u0639\u0631 \u062B\u0627\u0628\u062A' },
  { value: 'bogo', label: '\u0627\u0634\u062A\u0631\u0650 \u0648\u0627\u062D\u062F\u0627\u064B \u0648\u0627\u062D\u0635\u0644 \u0639\u0644\u0649 \u0622\u062E\u0631' },
  { value: 'fixed_discount', label: '\u062E\u0635\u0645 \u0628\u0642\u064A\u0645\u0629 \u062B\u0627\u0628\u062A\u0629' },
  { value: 'free_item', label: '\u0647\u062F\u064A\u0629 \u0645\u0639 \u0627\u0644\u0634\u0631\u0627\u0621' },
  { value: 'custom', label: '\u0646\u0648\u0639 \u0622\u062E\u0631' },
];

export function offerTypeLabel(type) {
  return OFFER_TYPE_OPTIONS.find((o) => o.value === type)?.label || type;
}

export function formatOfferBadge(offer) {
  if (!offer) return '';
  if (offer.pricing?.badge) return offer.pricing.badge;
  switch (offer?.offerType) {
    case 'discount':
      return offer.value != null ? `\u062E\u0635\u0645 ${offer.value}%` : '\u062E\u0635\u0645';
    case 'fixed_price':
      return offer.finalPrice != null ? `${offer.finalPrice} \u20AA` : '\u0633\u0639\u0631 \u062E\u0627\u0635';
    case 'fixed_discount':
      return offer.finalPrice != null ? `${offer.finalPrice} \u20AA` : '\u062E\u0635\u0645 \u062B\u0627\u0628\u062A';
    case 'bogo':
      return '1+1';
    case 'free_item':
      return '\u0647\u062F\u064A\u0629 \u0645\u0639 \u0627\u0644\u0634\u0631\u0627\u0621';
    case 'custom':
      return offer.finalPrice != null ? `${offer.finalPrice} \u20AA` : '\u0639\u0631\u0636';
    default:
      return '\u0639\u0631\u0636';
  }
}

/** @deprecated Use offer.pricing from API or POST /api/pricing/offer-preview */
export function resolveOfferPrices(offer) {
  if (offer?.pricing) {
    const p = offer.pricing;
    return { oldPrice: p.originalPrice, newPrice: p.finalPrice, showCompare: p.showCompare };
  }
  return { oldPrice: null, newPrice: offer?.finalPrice ?? null, showCompare: false };
}

function toNum(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/** Client-side mirror of backend pricing.service.js — used offline before upload. */
export function computeOfferFinalPrice({ offerType, originalPrice, value, finalPrice }) {
  const orig = toNum(originalPrice);
  const val = toNum(value);
  const direct = toNum(finalPrice);

  switch (offerType) {
    case 'discount':
      if (orig == null || val == null || val < 0 || val > 100) return null;
      return Math.max(0, Math.round(orig * (1 - val / 100) * 100) / 100);
    case 'fixed_price':
      if (val == null || val < 0) return null;
      return Math.round(val * 100) / 100;
    case 'fixed_discount':
      if (orig == null || val == null || val < 0) return null;
      return Math.max(0, Math.round((orig - val) * 100) / 100);
    case 'bogo':
      if (orig == null || orig < 0) return null;
      return Math.round((orig / 2) * 100) / 100;
    case 'free_item':
      if (orig == null || orig < 0) return null;
      return Math.round(orig * 100) / 100;
    case 'custom':
      if (direct == null || direct < 0) return null;
      return Math.round(direct * 100) / 100;
    default:
      return null;
  }
}

export function validateOfferPricing(offer) {
  const offerType = (offer?.offerType || '').trim() || 'discount';
  if (!offerType) {
    return { valid: false, finalPrice: null, message: 'يجب اختيار نوع العرض' };
  }
  const finalPrice = computeOfferFinalPrice({
    offerType,
    originalPrice: offer.originalPrice,
    value: offer.value,
    finalPrice: offer.finalPrice,
  });
  if (finalPrice == null) {
    return { valid: false, finalPrice: null, message: 'أكمل حقول نوع العرض لحساب السعر النهائي' };
  }
  return { valid: true, finalPrice, message: null };
}
