import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import MediaUploader from '../../components/MediaUploader';
import TagsInput from '../../components/TagsInput';
import CollapsibleSection from '../../components/CollapsibleSection';
import { FormNoticeToast, FormRulesPopup, useFormNotice } from '../../components/FormNotice';
import { OFFER_TYPE_OPTIONS } from '../../utils/offerPricing';
import PriceCurrencyInput from '../../components/PriceCurrencyInput';
import PriceUnitInput from '../../components/PriceUnitInput';
import { DEFAULT_CURRENCY, formatPriceWithUnit } from '../../utils/currency';
import { parsePriceUnit, resolvePriceUnit } from '../../utils/priceUnit';
import { PWA_TAB_PARAM } from '../../pwa/pwaShortcutActions';
import { invalidateCatalog } from '../../utils/catalogRefresh';
import '../../styles/AddProductsOffers.css';

const PRODUCT_RULES = [
  'اسم المنتج والسعر إلزاميان.',
  'صورة المنتج مطلوبة (كاميرا، جهاز، أو سحب وإفلات).',
  'يجب أن يكون لديك متجر/مستودع نشط قبل الإضافة.',
];

const OFFER_RULES = [
  'اسم العرض وصورته وتاريخ الانتهاء إلزاميان.',
  'تاريخ الانتهاء يجب أن يكون في المستقبل (يوم/شهر/سنة فقط).',
  'أقصى مدة للعرض: 7 أيام من تاريخ النشر.',
  'يُخفى العرض تلقائياً عند انتهاء التاريخ.',
  'يُرسل تنبيه قبل 24 ساعة من انتهاء العرض.',
  'أكمل حقول نوع العرض لحساب السعر النهائي.',
];

const VARIANT_PRESETS = ['اللون', 'المقاس', 'السعة', 'النوع'];

const DRAFT_PRODUCT_KEY = 'create-draft-product';
const DRAFT_OFFER_KEY = 'create-draft-offer';

const EMPTY_PRODUCT = {
  name: '',
  price: '',
  currency: DEFAULT_CURRENCY,
  priceUnitType: '',
  priceUnitCustom: '',
  image: '',
  description: '',
  freeDelivery: 'no',
  sku: '',
  quantity: '',
  variantsEnabled: false,
  variants: [],
  tags: [],
};

const EMPTY_OFFER = {
  title: '',
  offerType: 'discount',
  currency: DEFAULT_CURRENCY,
  priceUnitType: '',
  priceUnitCustom: '',
  originalPrice: '',
  value: '',
  finalPrice: '',
  image: '',
  description: '',
  freeDelivery: 'no',
  expiresAt: '',
  sku: '',
  quantity: '',
  variantsEnabled: false,
  variants: [],
  tags: [],
};

function loadDraft(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function saveDraft(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function clearDraft(key) {
  localStorage.removeItem(key);
}

/** Date-only (YYYY-MM-DD) → end-of-local-day ISO for existing API */
function dateOnlyToIso(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

function formatExpiryDisplay(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

function minExpiryDate() {
  const t = new Date();
  const yyyy = t.getFullYear();
  const mm = String(t.getMonth() + 1).padStart(2, '0');
  const dd = String(t.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isoToDateInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function AddProductsOffers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const editProductId = searchParams.get('editProduct');
  const editOfferId = searchParams.get('editOffer');
  const isEditMode = Boolean(editProductId || editOfferId);
  const [tab, setTab] = useState('product');
  const [loading, setLoading] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mediaResetKey, setMediaResetKey] = useState(0);
  const { notice, showNotice, clearNotice } = useFormNotice();
  const [product, setProduct] = useState(() => loadDraft(DRAFT_PRODUCT_KEY, EMPTY_PRODUCT));
  const [offer, setOffer] = useState(() => loadDraft(DRAFT_OFFER_KEY, EMPTY_OFFER));
  const [pricingPreview, setPricingPreview] = useState(null);

  useEffect(() => {
    const pwaTab = searchParams.get(PWA_TAB_PARAM);
    if (pwaTab !== 'product' && pwaTab !== 'offer') return;

    setTab(pwaTab);
    const next = new URLSearchParams(searchParams);
    next.delete(PWA_TAB_PARAM);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (editProductId) {
      setTab('product');
      (async () => {
        try {
          const { data } = await api.get('/products/my');
          const list = data.products || data || [];
          const item = list.find((p) => p._id === editProductId);
          if (!item) {
            showNotice('المنتج غير موجود', 'error');
            return;
          }
          setProduct({
            ...EMPTY_PRODUCT,
            name: item.name || '',
            price: item.price ?? '',
            currency: item.currency || DEFAULT_CURRENCY,
            ...parsePriceUnit(item.priceUnit),
            image: item.image || '',
            description: item.description || '',
            freeDelivery: item.freeDelivery ? 'yes' : 'no',
            isWholesale: item.isWholesale || false,
            sku: item.sku || '',
            quantity: item.stock ?? item.quantity ?? '',
            tags: item.tags || [],
          });
        } catch {
          showNotice('تعذّر تحميل المنتج', 'error');
        }
      })();
      return;
    }
    if (editOfferId) {
      setTab('offer');
      (async () => {
        try {
          const { data } = await api.get('/offers/my?all=true');
          const list = data.offers || data || [];
          const item = list.find((o) => o._id === editOfferId);
          if (!item) {
            showNotice('العرض غير موجود', 'error');
            return;
          }
          setOffer({
            ...EMPTY_OFFER,
            title: item.title || '',
            offerType: item.offerType || 'discount',
            currency: item.currency || DEFAULT_CURRENCY,
            ...parsePriceUnit(item.priceUnit),
            originalPrice: item.originalPrice ?? '',
            value: item.value ?? '',
            finalPrice: item.finalPrice ?? '',
            image: item.image || '',
            description: item.description || '',
            freeDelivery: item.freeDelivery ? 'yes' : 'no',
            expiresAt: isoToDateInput(item.expiresAt),
            sku: item.sku || '',
            quantity: item.stock ?? item.quantity ?? '',
            tags: item.tags || [],
          });
        } catch {
          showNotice('تعذّر تحميل العرض', 'error');
        }
      })();
    }
  }, [editProductId, editOfferId]);

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
          currency: offer.currency,
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
  }, [tab, offer.offerType, offer.originalPrice, offer.value, offer.finalPrice, offer.currency]);

  const previewPricing = pricingPreview?.pricing;
  const previewValid = pricingPreview?.valid === true;

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const baseRoute = user?.role === 'supplier' ? '/supplier' : '/store';
  const activeRules = tab === 'product' ? PRODUCT_RULES : OFFER_RULES;
  const rulesTitle = tab === 'product' ? 'قواعد إضافة المنتج' : 'قواعد إضافة العرض';

  const activeData = tab === 'product' ? product : offer;
  const setActiveData = tab === 'product' ? setProduct : setOffer;

  const updateInventory = (patch) => {
    setActiveData((prev) => ({ ...prev, ...patch }));
  };

  const addVariant = (name) => {
    setActiveData((prev) => {
      if (prev.variants.some((v) => v.name === name)) return prev;
      return {
        ...prev,
        variantsEnabled: true,
        variants: [...prev.variants, { name, values: '' }],
      };
    });
  };

  const updateVariant = (index, patch) => {
    setActiveData((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));
  };

  const removeVariant = (index) => {
    setActiveData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const handleSaveDraft = () => {
    if (tab === 'product') {
      saveDraft(DRAFT_PRODUCT_KEY, product);
      showNotice('تم حفظ مسودة المنتج — يمكنك المتابعة لاحقاً', 'success');
    } else {
      saveDraft(DRAFT_OFFER_KEY, offer);
      showNotice('تم حفظ مسودة العرض — يمكنك المتابعة لاحقاً', 'success');
    }
  };

  const handleQuickPreview = () => {
    setPreviewOpen(true);
  };

  const handleProductPublish = async () => {
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
      const priceUnit = resolvePriceUnit(product.priceUnitType, product.priceUnitCustom);
      const payload = {
        name: product.name.trim(),
        price: Number(product.price),
        currency: product.currency || DEFAULT_CURRENCY,
        priceUnit,
        image: product.image,
        description: product.description.trim(),
        isWholesale: product.isWholesale || false,
      };
      if (editProductId) {
        await api.put(`/products/${editProductId}`, payload);
        showNotice('تم تحديث المنتج بنجاح', 'success');
        invalidateCatalog(queryClient);
        queryClient.invalidateQueries({ queryKey: queryKeys.myProducts });
        navigate(`${baseRoute}/my-store`);
        return;
      }
      await api.post('/products', {
        ...payload,
        freeDelivery: product.freeDelivery === 'yes',
      });
      showNotice('تم نشر المنتج بنجاح', 'success');
      invalidateCatalog(queryClient);
      clearDraft(DRAFT_PRODUCT_KEY);
      setProduct(EMPTY_PRODUCT);
      setMediaResetKey((k) => k + 1);
    } catch (err) {
      showNotice(err.response?.data?.message || 'تعذّر إضافة المنتج', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOfferPublish = async () => {
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

    const expiresIso = dateOnlyToIso(offer.expiresAt);
    if (!expiresIso || new Date(expiresIso) <= new Date()) {
      showNotice('تاريخ الانتهاء يجب أن يكون في المستقبل', 'error');
      return;
    }

    setLoading(true);
    try {
      const priceUnit = resolvePriceUnit(offer.priceUnitType, offer.priceUnitCustom);
      const payload = {
        title: offer.title.trim(),
        offerType: offer.offerType,
        originalPrice: offer.originalPrice !== '' ? Number(offer.originalPrice) : undefined,
        value: offer.value !== '' ? Number(offer.value) : undefined,
        finalPrice: offer.offerType === 'custom' ? Number(offer.finalPrice) : previewPricing.finalPrice,
        currency: offer.currency || DEFAULT_CURRENCY,
        priceUnit,
        image: offer.image,
        description: offer.description.trim(),
        freeDelivery: offer.freeDelivery === 'yes',
        expiresAt: expiresIso,
      };
      if (editOfferId) {
        await api.put(`/offers/${editOfferId}`, payload);
        showNotice('تم تحديث العرض بنجاح', 'success');
        invalidateCatalog(queryClient);
        queryClient.invalidateQueries({ queryKey: queryKeys.myOffersAll });
        navigate(`${baseRoute}/my-store`);
        return;
      }
      await api.post('/offers', payload);
      showNotice('تم نشر العرض بنجاح', 'success');
      invalidateCatalog(queryClient);
      clearDraft(DRAFT_OFFER_KEY);
      setOffer(EMPTY_OFFER);
      setMediaResetKey((k) => k + 1);
    } catch (err) {
      showNotice(err.response?.data?.message || 'تعذّر إضافة العرض', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onFormSubmit = (e) => {
    e.preventDefault();
    if (tab === 'product') handleProductPublish();
    else handleOfferPublish();
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
              placeholder="السعر الأصلي *"
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
              placeholder="السعر القديم"
              value={offer.originalPrice}
              onChange={(e) => setOffer({ ...offer, originalPrice: e.target.value })}
            />
            <input
              type="number"
              min="0"
              step="any"
              placeholder="السعر الجديد *"
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
              placeholder="السعر الأصلي *"
              value={offer.originalPrice}
              onChange={(e) => setOffer({ ...offer, originalPrice: e.target.value })}
              required
            />
            <input
              type="number"
              min="0"
              step="any"
              placeholder="قيمة الخصم *"
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
            placeholder="سعر الشراء *"
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
            placeholder="السعر النهائي *"
            value={offer.finalPrice}
            onChange={(e) => setOffer({ ...offer, finalPrice: e.target.value })}
            required
          />
        );
      default:
        return null;
    }
  };

  const previewTitle = tab === 'product' ? product.name : offer.title;
  const previewDesc = activeData.description;
  const previewImage = activeData.image;
  const previewPriceLabel = (() => {
    const productUnit = resolvePriceUnit(product.priceUnitType, product.priceUnitCustom);
    const offerUnit = resolvePriceUnit(offer.priceUnitType, offer.priceUnitCustom);
    if (tab === 'product') {
      return product.price !== ''
        ? formatPriceWithUnit(product.price, product.currency, productUnit)
        : '—';
    }
    if (previewValid && previewPricing?.finalPrice != null) {
      return formatPriceWithUnit(previewPricing.finalPrice, offer.currency, offerUnit);
    }
    return '—';
  })();

  const renderInventorySection = () => (
    <CollapsibleSection
      title="5. المخزون والخيارات"
      subtitle="اختياري — لمعظم المتاجر يمكن تخطي هذا القسم"
      badge="اختياري"
      open={inventoryOpen}
      onToggle={() => setInventoryOpen((v) => !v)}
    >
      <label className="field-label">رمز المنتج (SKU)</label>
      <input
        value={activeData.sku}
        onChange={(e) => updateInventory({ sku: e.target.value })}
        placeholder="للتتبع الداخلي في المتجر"
      />

      <label className="field-label">الكمية المتاحة</label>
      <input
        type="number"
        min="0"
        step="1"
        value={activeData.quantity}
        onChange={(e) => updateInventory({ quantity: e.target.value })}
        placeholder="عدد القطع المتوفرة"
      />

      <div className="variant-toggle-row">
        <label className="field-label" htmlFor="variants-toggle">خيارات المنتج (متغيرات)</label>
        <label className="switch">
          <input
            id="variants-toggle"
            type="checkbox"
            checked={activeData.variantsEnabled}
            onChange={(e) => updateInventory({ variantsEnabled: e.target.checked })}
          />
          <span className="switch__slider" />
        </label>
      </div>

      {activeData.variantsEnabled && (
        <div className="variants-panel">
          <p className="field-hint">أمثلة شائعة:</p>
          <div className="variant-presets">
            {VARIANT_PRESETS.map((name) => (
              <button
                key={name}
                type="button"
                className="variant-preset"
                onClick={() => addVariant(name)}
                disabled={activeData.variants.some((v) => v.name === name)}
              >
                {name}
              </button>
            ))}
          </div>

          {activeData.variants.map((variant, index) => (
            <div key={variant.name} className="variant-row">
              <input
                value={variant.name}
                onChange={(e) => updateVariant(index, { name: e.target.value })}
                placeholder="اسم الخيار"
              />
              <input
                value={variant.values}
                onChange={(e) => updateVariant(index, { values: e.target.value })}
                placeholder="القيم مفصولة بفاصلة (أحمر، أزرق)"
              />
              <button type="button" className="variant-remove" onClick={() => removeVariant(index)}>
                حذف
              </button>
            </div>
          ))}

          <button
            type="button"
            className="ghost-btn"
            onClick={() => addVariant(`خيار ${activeData.variants.length + 1}`)}
          >
            + إضافة خيار
          </button>
        </div>
      )}
    </CollapsibleSection>
  );

  const renderPublishSection = () => (
    <section className="create-section create-section--publish">
      <h3 className="create-section__title">{isEditMode ? '7. حفظ التعديلات' : '7. الحفظ والنشر'}</h3>
      <p className="create-section__subtitle">{isEditMode ? 'راجع التغييرات ثم احفظ' : 'عاين النتيجة، احفظ مسودة، أو انشر فوراً'}</p>

      <div className="publish-actions">
        {!isEditMode && (
          <>
            <button type="button" className="publish-btn publish-btn--preview" onClick={handleQuickPreview}>
              معاينة سريعة
            </button>
            <button type="button" className="publish-btn publish-btn--draft" onClick={handleSaveDraft} disabled={loading}>
              حفظ كمسودة
            </button>
          </>
        )}
        <button
          type="submit"
          className="publish-btn publish-btn--now"
          disabled={loading || !activeData.image?.trim()}
        >
          {loading ? 'جارٍ الحفظ...' : isEditMode ? 'حفظ التعديلات' : 'نشر الآن'}
        </button>
      </div>
    </section>
  );

  return (
    <div className={`form-page create-story-page${isEditMode ? ' create-story-page--edit' : ''}`}>
      <FormNoticeToast notice={notice} onClose={clearNotice} />
      <FormRulesPopup
        open={rulesOpen}
        title={rulesTitle}
        rules={activeRules}
        onClose={() => setRulesOpen(false)}
      />

      <div className="form-page-head">
        <div>
          <h2 className="title">{isEditMode ? (tab === 'product' ? 'تعديل المنتج' : 'تعديل العرض') : 'إنشاء منشور للمتجر'}</h2>
          <p className="page-lead">{isEditMode ? 'حدّث التفاصيل واحفظ التغييرات' : 'أضف منتجاً أو عرضاً بنفس سهولة نشر قصة'}</p>
        </div>
        <button type="button" className="rules-info-btn" onClick={() => setRulesOpen(true)}>
          ℹ️ القواعد
        </button>
      </div>

      {!isEditMode && (
      <div className="tabs">
        <button type="button" className={tab === 'product' ? 'active' : ''} onClick={() => setTab('product')}>
          إضافة منتج
        </button>
        <button type="button" className={tab === 'offer' ? 'active' : ''} onClick={() => setTab('offer')}>
          إضافة عرض
        </button>
      </div>
      )}

      {tab === 'product' && (
        <form onSubmit={onFormSubmit} className="create-flow">
          <section className="create-section">
            <MediaUploader
              key={`product-media-${mediaResetKey}`}
              label="1. الصور والوسائط"
              value={product.image}
              onChange={(image) => setProduct((prev) => ({ ...prev, image }))}
              onError={(msg) => showNotice(msg, 'error')}
              required
              emptyHint="أضف صور المنتج أو العرض"
            />
          </section>

          <section className="create-section">
            <label className="field-label">2. اسم المنتج *</label>
            <input
              value={product.name}
              onChange={(e) => setProduct({ ...product, name: e.target.value })}
              placeholder="مثال: قميص قطن"
              required
            />
          </section>

          <section className="create-section">
            <label className="field-label">3. الوصف</label>
            <textarea
              value={product.description}
              onChange={(e) => setProduct({ ...product, description: e.target.value })}
              placeholder="اكتب وصفاً قصيراً كما تكتب منشوراً..."
            />
          </section>

          <section className="create-section">
            <h3 className="create-section__title">4. السعر والتفاصيل الأساسية</h3>
            <label className="field-label">السعر *</label>
            <div className="price-with-unit-row">
              <PriceCurrencyInput
                price={product.price}
                currency={product.currency}
                onPriceChange={(value) => setProduct({ ...product, price: value })}
                onCurrencyChange={(value) => setProduct({ ...product, currency: value })}
                pricePlaceholder="السعر"
                required
                className="price-currency-row"
              />
              <PriceUnitInput
                idPrefix="product-price-unit"
                unitType={product.priceUnitType}
                customUnit={product.priceUnitCustom}
                onUnitTypeChange={(value) => setProduct({ ...product, priceUnitType: value, priceUnitCustom: value === 'other' ? product.priceUnitCustom : '' })}
                onCustomUnitChange={(value) => setProduct({ ...product, priceUnitCustom: value })}
              />
            </div>

            <label className="field-label">هل يدعم التوصيل المجاني؟</label>
            <div className="radio-row">
              <label>
                <input
                  type="radio"
                  name="pDelivery"
                  checked={product.freeDelivery === 'yes'}
                  onChange={() => setProduct({ ...product, freeDelivery: 'yes' })}
                />
                نعم
              </label>
              <label>
                <input
                  type="radio"
                  name="pDelivery"
                  checked={product.freeDelivery === 'no'}
                  onChange={() => setProduct({ ...product, freeDelivery: 'no' })}
                />
                لا
              </label>
            </div>
          </section>

          {renderInventorySection()}

          <section className="create-section">
            <TagsInput
              label="6. الوسوم"
              value={product.tags}
              onChange={(tags) => setProduct({ ...product, tags })}
            />
          </section>

          {renderPublishSection()}
        </form>
      )}

      {tab === 'offer' && (
        <form onSubmit={onFormSubmit} className="create-flow">
          <section className="create-section">
            <MediaUploader
              key={`offer-media-${mediaResetKey}`}
              label="1. الصور والوسائط"
              value={offer.image}
              onChange={(image) => setOffer((prev) => ({ ...prev, image }))}
              onError={(msg) => showNotice(msg, 'error')}
              required
              emptyHint="أضف صور المنتج أو العرض"
            />
          </section>

          <section className="create-section">
            <label className="field-label">2. اسم العرض *</label>
            <input
              value={offer.title}
              onChange={(e) => setOffer({ ...offer, title: e.target.value })}
              placeholder="مثال: خصم نهاية الأسبوع"
              required
            />
          </section>

          <section className="create-section">
            <label className="field-label">3. الوصف</label>
            <textarea
              value={offer.description}
              onChange={(e) => setOffer({ ...offer, description: e.target.value })}
              placeholder="اشرح العرض للزبائن باختصار..."
            />
          </section>

          <section className="create-section">
            <h3 className="create-section__title">4. السعر والتفاصيل الأساسية</h3>

            <label className="field-label">نوع العرض *</label>
            <select
              value={offer.offerType}
              onChange={(e) => setOffer({
                ...offer,
                offerType: e.target.value,
                originalPrice: '',
                value: '',
                finalPrice: '',
              })}
            >
              {OFFER_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <div className="type-fields">
              <label className="field-label">العملة</label>
              <PriceCurrencyInput
                currency={offer.currency}
                onPriceChange={() => {}}
                onCurrencyChange={(value) => setOffer({ ...offer, currency: value })}
                currencyOnly
                className="price-currency-row currency-only-row"
              />
              {renderOfferFields()}
            </div>

            <PriceUnitInput
              idPrefix="offer-price-unit"
              unitType={offer.priceUnitType}
              customUnit={offer.priceUnitCustom}
              onUnitTypeChange={(value) => setOffer({ ...offer, priceUnitType: value, priceUnitCustom: value === 'other' ? offer.priceUnitCustom : '' })}
              onCustomUnitChange={(value) => setOffer({ ...offer, priceUnitCustom: value })}
            />

            {previewValid && previewPricing?.finalPrice != null && offer.offerType !== 'custom' && (
              <div className="final-price-box">
                {previewPricing.showCompare && previewPricing.displayOld && (
                  <span style={{ textDecoration: 'line-through', color: '#94a3b8', marginLeft: 8 }}>
                    {previewPricing.displayOld}
                  </span>
                )}
                السعر النهائي: <strong>{previewPriceLabel}</strong>
              </div>
            )}

            <label className="field-label">هل يوجد توصيل مجاني؟</label>
            <div className="radio-row">
              <label>
                <input
                  type="radio"
                  name="oDelivery"
                  checked={offer.freeDelivery === 'yes'}
                  onChange={() => setOffer({ ...offer, freeDelivery: 'yes' })}
                />
                نعم
              </label>
              <label>
                <input
                  type="radio"
                  name="oDelivery"
                  checked={offer.freeDelivery === 'no'}
                  onChange={() => setOffer({ ...offer, freeDelivery: 'no' })}
                />
                لا
              </label>
            </div>

            <div className="field-label-row">
              <label className="field-label" htmlFor="offer-expiry">تاريخ انتهاء العرض *</label>
              <button type="button" className="field-info-btn" onClick={() => setRulesOpen(true)}>
                ℹ️ قواعد الانتهاء
              </button>
            </div>
            <div className="date-field">
              <span className="date-field__icon" aria-hidden>📅</span>
              <input
                id="offer-expiry"
                type="date"
                className="date-field__input"
                value={offer.expiresAt}
                min={minExpiryDate()}
                onChange={(e) => setOffer({ ...offer, expiresAt: e.target.value })}
                required
              />
              {!offer.expiresAt && (
                <span className="date-field__placeholder">📅 اختر تاريخ الانتهاء</span>
              )}
            </div>
            {offer.expiresAt && (
              <p className="expiry-display">
                ينتهي العرض بتاريخ: {formatExpiryDisplay(offer.expiresAt)}
              </p>
            )}
          </section>

          {renderInventorySection()}

          <section className="create-section">
            <TagsInput
              label="6. الوسوم"
              value={offer.tags}
              onChange={(tags) => setOffer({ ...offer, tags })}
            />
          </section>

          {renderPublishSection()}
        </form>
      )}

      <button type="button" className="link-btn" onClick={() => navigate(`${baseRoute}/offers`)}>
        إدارة العروض الحالية ←
      </button>

      {previewOpen && (
        <div className="preview-backdrop" role="dialog" aria-modal="true" aria-label="معاينة سريعة">
          <div className="preview-modal">
            <div className="preview-modal__head">
              <h3>معاينة في تطبيق الزبون</h3>
              <button type="button" className="preview-modal__close" onClick={() => setPreviewOpen(false)} aria-label="إغلاق">
                ×
              </button>
            </div>

            <div className="preview-phone">
              <div className="preview-phone__media">
                {previewImage ? (
                  <img src={previewImage} alt="" />
                ) : (
                  <div className="preview-phone__empty">أضف صورة للمعاينة</div>
                )}
                {tab === 'offer' && <span className="preview-phone__badge">عرض</span>}
              </div>
              <div className="preview-phone__body">
                <h4>{previewTitle?.trim() || (tab === 'product' ? 'اسم المنتج' : 'اسم العرض')}</h4>
                <p className="preview-phone__price">{previewPriceLabel}</p>
                {tab === 'offer' && offer.expiresAt && (
                  <p className="preview-phone__meta">
                    ينتهي بتاريخ {formatExpiryDisplay(offer.expiresAt)}
                  </p>
                )}
                <p className="preview-phone__desc">
                  {previewDesc?.trim() || 'سيظهر الوصف هنا...'}
                </p>
                {activeData.tags?.length > 0 && (
                  <div className="preview-phone__tags">
                    {activeData.tags.map((t) => (
                      <span key={t}>#{t}</span>
                    ))}
                  </div>
                )}
                {activeData.freeDelivery === 'yes' && (
                  <span className="preview-phone__delivery">توصيل مجاني</span>
                )}
              </div>
            </div>

            <button type="button" className="preview-modal__done" onClick={() => setPreviewOpen(false)}>
              إغلاق المعاينة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
