import { formatPriceWithUnit } from '../utils/currency';
import { resolvePriceUnit } from '../utils/priceUnit';

function formatExpiryDisplay(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = String(dateStr).split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

/**
 * Quick preview of how the product/offer may appear in the customer app.
 */
export default function QuickPreviewModal({ open, kind, data, pricing, onClose }) {
  if (!open) return null;

  const isOffer = kind === 'offer';
  const title = isOffer ? (data?.title || 'اسم العرض') : (data?.name || 'اسم المنتج');
  const description = data?.description || 'لا يوجد وصف بعد.';
  const image = data?.image;
  const tags = data?.tags || [];
  const freeDelivery = data?.freeDelivery === 'yes';

  const priceUnit = resolvePriceUnit(data?.priceUnitType, data?.priceUnitCustom);

  let priceLabel = '';
  if (isOffer) {
    if (pricing?.finalPrice != null) {
      priceLabel = formatPriceWithUnit(pricing.finalPrice, data?.currency, priceUnit);
    } else priceLabel = 'السعر يظهر بعد إكمال الحقول';
  } else {
    priceLabel = data?.price !== '' && data?.price != null
      ? formatPriceWithUnit(data.price, data.currency, priceUnit)
      : '—';
  }

  return (
    <div className="preview-backdrop" role="dialog" aria-modal="true" aria-label="معاينة سريعة" onClick={onClose}>
      <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preview-modal__head">
          <h3>معاينة سريعة</h3>
          <button type="button" className="preview-modal__close" onClick={onClose} aria-label="إغلاق">×</button>
        </div>
        <p className="preview-modal__hint">هكذا سيظهر تقريباً في تطبيق الزبائن</p>

        <article className="preview-card">
          <div className="preview-card__media">
            {image ? (
              <img src={image} alt="" />
            ) : (
              <div className="preview-card__placeholder">أضف صورة للمعاينة</div>
            )}
            {isOffer && <span className="preview-card__badge">عرض</span>}
          </div>
          <div className="preview-card__body">
            <h4>{title}</h4>
            <p className="preview-card__price">{priceLabel}</p>
            {isOffer && data?.expiresAt && (
              <p className="preview-card__expiry">
                ينتهي العرض بتاريخ: {formatExpiryDisplay(data.expiresAt)}
              </p>
            )}
            {freeDelivery && <p className="preview-card__delivery">توصيل مجاني</p>}
            <p className="preview-card__desc">{description}</p>
            {tags.length > 0 && (
              <div className="preview-card__tags">
                {tags.map((t) => (
                  <span key={t}>#{t}</span>
                ))}
              </div>
            )}
          </div>
        </article>

        <button type="button" className="preview-modal__done" onClick={onClose}>
          حسناً
        </button>
      </div>
    </div>
  );
}
