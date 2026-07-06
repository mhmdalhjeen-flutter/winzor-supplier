import { formatOfferBadge } from '../utils/offerPricing';
import '../styles/OfferPriceDisplay.css';

/** Reads pricing from API SSOT — no local price calculation. */
export default function OfferPriceDisplay({ offer, className = '' }) {
  const pricing = offer?.pricing;
  const oldPrice = pricing?.originalPrice;
  const newPrice = pricing?.finalPrice;
  const showCompare = pricing?.showCompare ?? false;
  const badge = pricing?.badge || formatOfferBadge(offer);

  if (newPrice == null && !badge) return null;

  const showTypeBadge = ['bogo', 'free_item', 'discount', 'fixed_discount'].includes(offer?.offerType);

  return (
    <div className={`offer-price-display ${className}`.trim()}>
      {showCompare && oldPrice != null && (
        <span className="offer-price-old" aria-label="السعر القديم">
          {pricing?.displayOld || `${oldPrice} ₪`}
        </span>
      )}
      {newPrice != null ? (
        <span className="offer-price-new">{pricing?.displayNew || `${newPrice} ₪`}</span>
      ) : (
        <span className="offer-price-new">{badge}</span>
      )}
      {showTypeBadge && badge && (
        <span className="offer-price-badge">{badge}</span>
      )}
    </div>
  );
}
