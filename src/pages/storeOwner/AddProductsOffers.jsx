import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ImagePicker from '../../components/ImagePicker';
import { FormNoticeToast, FormRulesPopup, useFormNotice } from '../../components/FormNotice';
import { OFFER_TYPE_OPTIONS } from '../../utils/offerPricing';
import '../../styles/AddProductsOffers.css';

const PRODUCT_RULES = [
  'اسم المنتج والسعر إلزاميان.',
  'صورة المنتج مطلوبة (كاميرا، جهاز، أو رابط).',
  'يتم ضغط الصورة تلقائياً قبل الرفع.',
  'يجب أن يكون لديك متجر/مستودع نشط قبل الإضافة.',
];

const OFFER_RULES = [
  'اسم العرض وصورته وتاريخ الانتهاء إلزاميان.',
  'تاريخ الانتهاء يجب أن يكون في المستقبل.',
  'أقصى مدة للعرض: 7 أيام من تاريخ النشر.',
  'يُخفى العرض تلقائياً عند انتهاء التاريخ.',
  'يُرسل تنبيه قبل 24 ساعة من انتهاء العرض.',
  'أكمل حقول نوع العرض لحساب السعر النهائي.',
  'يتم ضغط الصورة تلقائياً قبل الرفع.',
];

const EMPTY_PRODUCT = {
  name: '',
  price: '',
  image: '',
  description: '',
  freeDelivery: 'no',
};

const EMPTY_OFFER = {
  title: '',
  offerType: 'discount',
  originalPrice: '',
  value: '',
  finalPrice: '',
  image: '',
  description: '',
  freeDelivery: 'no',
  expiresAt: '',
};

export default function AddProductsOffers() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('product');
  const [loading, setLoading] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const { notice, showNotice, clearNotice } = useFormNotice();
  const [product, setProduct] = useState(EMPTY_PRODUCT);
  const [offer, setOffer] = useState(EMPTY_OFFER);
  const [pricingPreview, setPricingPreview] = useState(null);

  useEffect(() => {
    if (tab !== 'offer') return undefined;
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.post('/pricing/offer-preview', {
          offerType: offer.offerType,
          originalPrice: offer.originalPrice,
          value: offer.value,
          finalPrice: offer.finalPrice,
        });
        if (!cancelled) setPricingPreview(data);
      } catch {
        if (!cancelled) setPricingPreview(null);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tab, offer.offerType, offer.originalPrice, offer.value, offer.finalPrice]);

  const previewPricing = pricingPreview?.pricing;
  const previewValid = pricingPreview?.valid === true;

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const baseRoute = user?.role === 'supplier' ? '/supplier' : '/store';
  const activeRules = tab === 'product' ? PRODUCT_RULES : OFFER_RULES;
  const rulesTitle = tab === 'product' ? 'قواعد إضافة المنتج' : 'قواعد إضافة العرض';

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!product.name.trim() || product.price === '') {
      showNotice('اسم المنتج والسعر مطلوبان', 'error');
      return;
    }
    if (!product.image) {
      showNotice('صورة المنتج مطلوبة', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/products', {
        name: product.name.trim(),
        price: Number(product.price),
        image: product.image,
        description: product.description.trim(),
        freeDelivery: product.freeDelivery === 'yes',
      });
      showNotice('تم إضافة المنتج بنجاح', 'success');
      setProduct(EMPTY_PRODUCT);
    } catch (err) {
      showNotice(err.response?.data?.message || 'تعذّر إضافة المنتج', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOfferSubmit = async (e) => {
    e.preventDefault();
    if (!offer.title.trim()) {
      showNotice('اسم العرض مطلوب', 'error');
      return;
    }
    if (!offer.image) {
      showNotice('صورة العرض مطلوبة', 'error');
      return;
    }
    if (!offer.expiresAt) {
      showNotice('تاريخ انتهاء العرض مطلوب', 'error');
      return;
    }
    if (!previewValid || previewPricing?.finalPrice == null) {
      showNotice('أكمل حقول نوع العرض لحساب السعر النهائي', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/offers', {
        title: offer.title.trim(),
        offerType: offer.offerType,
        originalPrice: offer.originalPrice !== '' ? Number(offer.originalPrice) : undefined,
        value: offer.value !== '' ? Number(offer.value) : undefined,
        finalPrice: offer.offerType === 'custom' ? Number(offer.finalPrice) : previewPricing.finalPrice,
        image: offer.image,
        description: offer.description.trim(),
        freeDelivery: offer.freeDelivery === 'yes',
        expiresAt: new Date(offer.expiresAt).toISOString(),
      });
      showNotice('تم إضافة العرض بنجاح', 'success');
      setOffer(EMPTY_OFFER);
    } catch (err) {
      showNotice(err.response?.data?.message || 'تعذّر إضافة العرض', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderOfferFields = () => {
    switch (offer.offerType) {
      case 'discount':
        return (
          <>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="السعر الأصلي (₪) *"
              value={offer.originalPrice}
              onChange={(e) => setOffer({ ...offer, originalPrice: e.target.value })}
              required
            />
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              placeholder="نسبة الخصم % *"
              value={offer.value}
              onChange={(e) => setOffer({ ...offer, value: e.target.value })}
              required
            />
          </>
        );
      case 'fixed_price':
        return (
          <>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="السعر القديم (₪)"
              value={offer.originalPrice}
              onChange={(e) => setOffer({ ...offer, originalPrice: e.target.value })}
            />
            <input
              type="number"
              min="0"
              step="any"
              placeholder="السعر الجديد (₪) *"
              value={offer.value}
              onChange={(e) => setOffer({ ...offer, value: e.target.value })}
              required
            />
          </>
        );
      case 'fixed_discount':
        return (
          <>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="السعر الأصلي (₪) *"
              value={offer.originalPrice}
              onChange={(e) => setOffer({ ...offer, originalPrice: e.target.value })}
              required
            />
            <input
              type="number"
              min="0"
              step="any"
              placeholder="قيمة الخصم (₪) *"
              value={offer.value}
              onChange={(e) => setOffer({ ...offer, value: e.target.value })}
              required
            />
          </>
        );
      case 'bogo':
      case 'free_item':
        return (
          <input
            type="number"
            min="0"
            step="any"
            placeholder="سعر الشراء (₪) *"
            value={offer.originalPrice}
            onChange={(e) => setOffer({ ...offer, originalPrice: e.target.value })}
            required
          />
        );
      case 'custom':
        return (
          <input
            type="number"
            min="0"
            step="any"
            placeholder="السعر النهائي (₪) *"
            value={offer.finalPrice}
            onChange={(e) => setOffer({ ...offer, finalPrice: e.target.value })}
            required
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="form-page">
      <FormNoticeToast notice={notice} onClose={clearNotice} />
      <FormRulesPopup
        open={rulesOpen}
        title={rulesTitle}
        rules={activeRules}
        onClose={() => setRulesOpen(false)}
      />

      <div className="form-page-head">
        <h2 className="title">إدارة المنتجات والعروض</h2>
        <button type="button" className="rules-info-btn" onClick={() => setRulesOpen(true)}>
          ℹ️ القواعد
        </button>
      </div>

      <div className="tabs">
        <button type="button" className={tab === 'product' ? 'active' : ''} onClick={() => setTab('product')}>
          إضافة منتج
        </button>
        <button type="button" className={tab === 'offer' ? 'active' : ''} onClick={() => setTab('offer')}>
          إضافة عرض
        </button>
      </div>

      {tab === 'product' && (
        <form onSubmit={handleProductSubmit} className="card-form">
          <label className="field-label">1. اسم المنتج *</label>
          <input
            value={product.name}
            onChange={(e) => setProduct({ ...product, name: e.target.value })}
            placeholder="مثال: قميص قطن"
            required
          />

          <label className="field-label">2. السعر (₪) *</label>
          <input
            type="number"
            min="0"
            step="any"
            value={product.price}
            onChange={(e) => setProduct({ ...product, price: e.target.value })}
            required
          />

          <ImagePicker
            label="3. صورة المنتج"
            value={product.image}
            onChange={(image) => setProduct({ ...product, image })}
            onError={(msg) => showNotice(msg, 'error')}
            required
          />

          <label className="field-label">4. تفاصيل المنتج</label>
          <textarea
            value={product.description}
            onChange={(e) => setProduct({ ...product, description: e.target.value })}
            placeholder="وصف مختصر للمنتج..."
          />

          <label className="field-label">5. هل يدعم التوصيل المجاني؟</label>
          <div className="radio-row">
            <label><input type="radio" name="pDelivery" checked={product.freeDelivery === 'yes'} onChange={() => setProduct({ ...product, freeDelivery: 'yes' })} /> نعم</label>
            <label><input type="radio" name="pDelivery" checked={product.freeDelivery === 'no'} onChange={() => setProduct({ ...product, freeDelivery: 'no' })} /> لا</label>
          </div>

          <button type="submit" disabled={loading || !product.image?.trim()}>
            {loading ? 'جارٍ الحفظ...' : 'إضافة المنتج'}
          </button>
        </form>
      )}

      {tab === 'offer' && (
        <form onSubmit={handleOfferSubmit} className="card-form">
          <label className="field-label">1. اسم العرض *</label>
          <input
            value={offer.title}
            onChange={(e) => setOffer({ ...offer, title: e.target.value })}
            placeholder="مثال: خصم نهاية الأسبوع"
            required
          />

          <label className="field-label">2. نوع العرض *</label>
          <select
            value={offer.offerType}
            onChange={(e) => setOffer({ ...offer, offerType: e.target.value, originalPrice: '', value: '', finalPrice: '' })}
          >
            {OFFER_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <div className="type-fields">{renderOfferFields()}</div>

          {previewValid && previewPricing?.finalPrice != null && offer.offerType !== 'custom' && (
            <div className="final-price-box">
              {previewPricing.showCompare && previewPricing.displayOld && (
                <span style={{ textDecoration: 'line-through', color: '#94a3b8', marginLeft: 8 }}>
                  {previewPricing.displayOld}
                </span>
              )}
              السعر النهائي: <strong>{previewPricing.displayNew || `${previewPricing.finalPrice} ₪`}</strong>
            </div>
          )}

          <ImagePicker
            label="صورة العرض"
            value={offer.image}
            onChange={(image) => setOffer({ ...offer, image })}
            onError={(msg) => showNotice(msg, 'error')}
            required
          />

          <label className="field-label">تفاصيل العرض</label>
          <textarea
            value={offer.description}
            onChange={(e) => setOffer({ ...offer, description: e.target.value })}
            placeholder="اشرح العرض للزبائن..."
          />

          <label className="field-label">هل يوجد توصيل مجاني؟</label>
          <div className="radio-row">
            <label><input type="radio" name="oDelivery" checked={offer.freeDelivery === 'yes'} onChange={() => setOffer({ ...offer, freeDelivery: 'yes' })} /> نعم</label>
            <label><input type="radio" name="oDelivery" checked={offer.freeDelivery === 'no'} onChange={() => setOffer({ ...offer, freeDelivery: 'no' })} /> لا</label>
          </div>

          <div className="field-label-row">
            <label className="field-label">تاريخ انتهاء العرض *</label>
            <button type="button" className="field-info-btn" onClick={() => setRulesOpen(true)}>
              ℹ️ قواعد الانتهاء
            </button>
          </div>
          <input
            type="datetime-local"
            value={offer.expiresAt}
            onChange={(e) => setOffer({ ...offer, expiresAt: e.target.value })}
            required
          />

          <button type="submit" disabled={loading || !offer.image?.trim()}>
            {loading ? 'جارٍ النشر...' : 'نشر العرض'}
          </button>
        </form>
      )}

      <button type="button" className="link-btn" onClick={() => navigate(`${baseRoute}/offers`)}>
        إدارة العروض الحالية ←
      </button>
    </div>
  );
}
