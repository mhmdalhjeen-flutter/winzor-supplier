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

/** @deprecated Use POST /api/pricing/offer-preview — kept for import compatibility */
export function computeOfferFinalPrice() {
  return null;
}
