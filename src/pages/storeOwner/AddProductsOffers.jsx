import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import MediaUploader from '../../components/MediaUploader';
import TagsInput from '../../components/TagsInput';
import CollapsibleSection from '../../components/CollapsibleSection';
import { FormNoticeToast, FormRulesPopup, useFormNotice } from '../../components/FormNotice';
import { OFFER_TYPE_OPTIONS, validateOfferPricing, resolveOfferType } from '../../utils/offerPricing';
import PriceCurrencyInput from '../../components/PriceCurrencyInput';
import PriceUnitInput from '../../components/PriceUnitInput';
import { DEFAULT_CURRENCY, formatPriceWithUnit } from '../../utils/currency';
import { parsePriceUnit, resolvePriceUnit } from '../../utils/priceUnit';
import { PWA_TAB_PARAM } from '../../pwa/pwaShortcutActions';
import { invalidateCatalog } from '../../utils/catalogRefresh';
import { unwrapList } from '../../utils/unwrapList';
import { queryKeys } from '../../lib/queryClient';
import { enqueuePublishItem, getPublishItem, updatePublishItem, resolveQueueBlob } from '../../lib/offlinePublishQueue';
import ItemCategorySelect from '../../components/ItemCategorySelect';
import RelatedItemSelect from '../../components/RelatedItemSelect';
import PurchaseModeSelect from '../../components/PurchaseModeSelect';
import AvailabilitySwitch from '../../components/AvailabilitySwitch';
import NumericInput from '../../components/NumericInput';
import { saveDraftEntry, getDraft, deleteDraft } from '../../utils/draftsStorage';
import '../../styles/AddProductsOffers.css';
import '../../styles/itemCategories.css';
import '../../styles/Drafts.css';
import '../../styles/purchaseMode.css';

const PRODUCT_RULES = [
  'اسم العنصر والسعر إلزاميان.',
  'صورة العنصر مطلوبة (كاميرا، جهاز، أو سحب وإفلات).',
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
  variantsEnabled: false,
  variants: [],
  tags: [],
  storeItemCategoryId: '',
  relatedProductId: '',
  isActive: true,
  purchaseMode: 'quantity',
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
  variantsEnabled: false,
  variants: [],
  tags: [],
  storeItemCategoryId: '',
  relatedProductId: '',
  isActive: true,
};

function loadDraft(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const merged = { ...fallback, ...JSON.parse(raw) };
    if (key === DRAFT_OFFER_KEY) {
      merged.offerType = resolveOfferType(merged);
    }
    return merged;
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
  const pendingId = searchParams.get('pendingId');
  const draftIdParam = searchParams.get('draftId');
  const tabParam = searchParams.get('tab');
  const isEditMode = Boolean(editProductId || editOfferId);
  const isPendingEdit = Boolean(pendingId);
  const [tab, setTab] = useState(tabParam === 'offer' ? 'offer' : 'product');
  const [loading, setLoading] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mediaResetKey, setMediaResetKey] = useState(0);
  const [currentDraftId, setCurrentDraftId] = useState(draftIdParam || null);
  const { notice, showNotice, clearNotice } = useFormNotice();
  const [product, setProduct] = useState(EMPTY_PRODUCT);
  const [offer, setOffer] = useState({ ...EMPTY_OFFER, offerType: 'fixed_price' });
  const [localImageFile, setLocalImageFile] = useState(null);
  const [expandedVariants, setExpandedVariants] = useState({});
  const [pricingPreview, setPricingPreview] = useState(null);
  const [pendingItemId, setPendingItemId] = useState(null);

  useEffect(() => {
    if (isEditMode) setAdvancedOpen(true);
  }, [isEditMode]);

  useEffect(() => {
    if (!draftIdParam || isEditMode || isPendingEdit) return;
    const draft = getDraft(draftIdParam);
    if (!draft) return;
    setCurrentDraftId(draftIdParam);
    setTab(draft.type === 'offer' ? 'offer' : 'product');
    if (draft.type === 'product') setProduct({ ...EMPTY_PRODUCT, ...draft.data });
    else setOffer({ ...EMPTY_OFFER, offerType: 'fixed_price', ...draft.data });
    if (draft.data?.image) setMediaResetKey((k) => k + 1);
  }, [draftIdParam, isEditMode, isPendingEdit]);

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
            showNotice('العنصر غير موجود', 'error');
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
            tags: item.tags || [],
            storeItemCategoryId: item.storeItemCategory?._id || item.storeItemCategory || '',
            isActive: item.isActive !== false,
            purchaseMode: item.purchaseMode || 'quantity',
          });
        } catch {
          showNotice('تعذّر تحميل العنصر', 'error');
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
            tags: item.tags || [],
            storeItemCategoryId: item.storeItemCategory?._id || item.storeItemCategory || '',
            relatedProductId: item.relatedProduct?._id || item.relatedProduct || '',
            isActive: item.isActive !== false,
          });
        } catch {
          showNotice('تعذّر تحميل العرض', 'error');
        }
      })();
    }
  }, [editProductId, editOfferId]);

  useEffect(() => {
    if (!pendingId) return;
    (async () => {
      try {
        const item = await getPublishItem(pendingId);
        if (!item) {
          showNotice('الإضافة المعلقة غير موجودة', 'error');
          return;
        }
        setPendingItemId(item.id);
        if (item.type === 'product') {
          setTab('product');
          const p = item.payload || {};
          setProduct({
            ...EMPTY_PRODUCT,
            name: p.name || '',
            price: p.price ?? '',
            currency: p.currency || DEFAULT_CURRENCY,
            ...parsePriceUnit(p.priceUnit),
            image: item.remoteImageUrl || p.image || '',
            description: p.description || '',
            freeDelivery: p.freeDelivery ? 'yes' : 'no',
            isWholesale: p.isWholesale || false,
          });
        } else {
          setTab('offer');
          const o = item.payload || {};
          setOffer({
            ...EMPTY_OFFER,
            title: o.title || '',
            offerType: o.offerType || 'discount',
            currency: o.currency || DEFAULT_CURRENCY,
            ...parsePriceUnit(o.priceUnit),
            originalPrice: o.originalPrice ?? '',
            value: o.value ?? '',
            finalPrice: o.finalPrice ?? '',
            image: item.remoteImageUrl || o.image || '',
            description: o.description || '',
            freeDelivery: o.freeDelivery ? 'yes' : 'no',
            expiresAt: isoToDateInput(o.expiresAt),
          });
        }
        const blob = await resolveQueueBlob(item.imageBlob);
        if (blob) setLocalImageFile(blob);
        setMediaResetKey((k) => k + 1);
      } catch {
        showNotice('تعذّر تحميل الإضافة المعلقة', 'error');
      }
    })();
  }, [pendingId]);

  useEffect(() => {
    if (tab !== 'offer') return;
    setOffer((prev) => {
      const nextType = resolveOfferType(prev);
      if (prev.offerType === nextType) return prev;
      return { ...prev, offerType: nextType };
    });
  }, [tab]);

  useEffect(() => {
    if (tab !== 'offer') return undefined;
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.post('/pricing/offer-preview', {
          offerType: resolveOfferType(offer),
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
  const effectiveOfferType = resolveOfferType(offer);
  const normalizedOffer = {
    ...offer,
    offerType: effectiveOfferType,
  };
  const offlineOfferPricing = validateOfferPricing(normalizedOffer);
  const offerPricingReady = navigator.onLine
    ? (previewValid || offlineOfferPricing.valid)
    : offlineOfferPricing.valid;
  const resolvedOfferFinalPrice = previewPricing?.finalPrice ?? offlineOfferPricing.finalPrice;

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const baseRoute = user?.role === 'supplier' ? '/supplier' : '/store';
  const activeRules = tab === 'product' ? PRODUCT_RULES : OFFER_RULES;
  const rulesTitle = tab === 'product' ? 'قواعد إضافة العنصر' : 'قواعد إضافة العرض';

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

  const clearCurrentDraft = () => {
    if (currentDraftId) {
      deleteDraft(currentDraftId);
      setCurrentDraftId(null);
    }
    clearDraft(tab === 'product' ? DRAFT_PRODUCT_KEY : DRAFT_OFFER_KEY);
  };

  const handleSaveDraft = () => {
    const type = tab === 'product' ? 'product' : 'offer';
    const data = tab === 'product' ? product : offer;
    const title = tab === 'product' ? (product.name || 'مسودة عنصر') : (offer.title || 'مسودة عرض');
    const entry = saveDraftEntry({
      id: currentDraftId,
      type,
      data,
      title,
      imagePreview: data.image || '',
    });
    setCurrentDraftId(entry.id);
    showNotice('تم حفظ المسودة — يمكنك متابعتها من صفحة المسودات', 'success');
  };

  const handleQuickPreview = () => {
    setPreviewOpen(true);
  };

  const handleProductPublish = async () => {
    if (!product.name.trim() || product.price === '') {
      showNotice('اسم العنصر والسعر مطلوبان', 'error');
      return;
    }
    if (!product.image && !localImageFile) {
      showNotice('صورة العنصر مطلوبة', 'error');
      return;
    }

    const priceUnit = resolvePriceUnit(product.priceUnitType, product.priceUnitCustom);
    const payload = {
      name: product.name.trim(),
      price: Number(product.price),
      currency: product.currency || DEFAULT_CURRENCY,
      priceUnit,
      image: product.image,
      description: product.description.trim(),
      isWholesale: product.isWholesale || false,
      freeDelivery: product.freeDelivery === 'yes',
      storeItemCategoryId: product.storeItemCategoryId || undefined,
      isActive: product.isActive !== false,
      purchaseMode: product.purchaseMode || 'quantity',
    };

    if (editProductId) {
      setLoading(true);
      try {
        await api.put(`/products/${editProductId}`, payload);
        showNotice('تم تحديث العنصر بنجاح', 'success');
        clearCurrentDraft();
        invalidateCatalog(queryClient);
        queryClient.invalidateQueries({ queryKey: queryKeys.myProducts });
        navigate(`${baseRoute}/my-store`);
      } catch (err) {
        showNotice(err.response?.data?.message || 'تعذّر تحديث العنصر', 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!navigator.onLine || (localImageFile && !product.image)) {
      const queuePayload = { type: 'product', payload, imageBlob: localImageFile, imagePreviewUrl: localImageFile ? URL.createObjectURL(localImageFile) : '', remoteImageUrl: product.image || '' };
      const wasPending = pendingItemId;
      if (wasPending) {
        await updatePublishItem(wasPending, { ...queuePayload, status: 'pending', error: null });
        showNotice('تم تحديث العنصر المعلق — سيُرفع تلقائياً عند توفر الإنترنت', 'success');
      } else {
        await enqueuePublishItem(queuePayload);
        showNotice('تم حفظ العنصر محلياً — سيُرفع تلقائياً عند توفر الإنترنت', 'success');
        clearCurrentDraft();
        setProduct(EMPTY_PRODUCT);
      }
      setLocalImageFile(null);
      setPendingItemId(null);
      setMediaResetKey((k) => k + 1);
      if (wasPending) navigate(`${baseRoute}/pending-uploads`);
      return;
    }

    setLoading(true);
    try {
      await api.post('/products', payload);
      showNotice('تم نشر العنصر بنجاح', 'success');
      invalidateCatalog(queryClient);
      clearCurrentDraft();
      setProduct(EMPTY_PRODUCT);
      setLocalImageFile(null);
      setMediaResetKey((k) => k + 1);
    } catch (err) {
      showNotice(err.response?.data?.message || 'تعذّر إضافة العنصر', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOfferPublish = async () => {
    const offerTitle = offer.title.trim() || (offer.relatedProductId ? 'عرض' : '');
    if (!offerTitle && !offer.relatedProductId) {
      showNotice('اختر العنصر أو أدخل اسم العرض', 'error');
      return;
    }
    if (!offer.image && !localImageFile) {
      showNotice('صورة العرض مطلوبة', 'error');
      return;
    }
    if (!offer.expiresAt) {
      showNotice('تاريخ انتهاء العرض مطلوب', 'error');
      return;
    }
    if (!offerPricingReady || resolvedOfferFinalPrice == null) {
      showNotice(offlineOfferPricing.message || 'أكمل حقول نوع العرض لحساب السعر النهائي', 'error');
      return;
    }

    const expiresIso = dateOnlyToIso(offer.expiresAt);
    if (!expiresIso || new Date(expiresIso) <= new Date()) {
      showNotice('تاريخ الانتهاء يجب أن يكون في المستقبل', 'error');
      return;
    }

    const priceUnit = resolvePriceUnit(offer.priceUnitType, offer.priceUnitCustom);
    const payload = {
      title: offerTitle || offer.title.trim(),
      offerType: normalizedOffer.offerType,
      originalPrice: offer.originalPrice !== '' ? Number(offer.originalPrice) : undefined,
      value: offer.value !== '' ? Number(offer.value) : undefined,
      finalPrice: effectiveOfferType === 'custom' ? Number(offer.finalPrice) : resolvedOfferFinalPrice,
      currency: offer.currency || DEFAULT_CURRENCY,
      priceUnit,
      image: offer.image,
      description: offer.description.trim(),
      freeDelivery: offer.freeDelivery === 'yes',
      expiresAt: expiresIso,
      storeItemCategoryId: offer.storeItemCategoryId || undefined,
      relatedProductId: offer.relatedProductId || undefined,
      isActive: offer.isActive !== false,
    };

    if (editOfferId) {
      setLoading(true);
      try {
        await api.put(`/offers/${editOfferId}`, payload);
        showNotice('تم تحديث العرض بنجاح', 'success');
        clearCurrentDraft();
        invalidateCatalog(queryClient);
        queryClient.invalidateQueries({ queryKey: queryKeys.myOffersAll });
        navigate(`${baseRoute}/my-store`);
      } catch (err) {
        showNotice(err.response?.data?.message || 'تعذّر تحديث العرض', 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!navigator.onLine || (localImageFile && !offer.image)) {
      const queuePayload = { type: 'offer', payload, imageBlob: localImageFile, imagePreviewUrl: localImageFile ? URL.createObjectURL(localImageFile) : '', remoteImageUrl: offer.image || '' };
      const wasPending = pendingItemId;
      if (wasPending) {
        await updatePublishItem(wasPending, { ...queuePayload, status: 'pending', error: null });
        showNotice('تم تحديث العرض المعلق — سيُرفع تلقائياً عند توفر الإنترنت', 'success');
      } else {
        await enqueuePublishItem(queuePayload);
        showNotice('تم حفظ العرض محلياً — سيُرفع تلقائياً عند توفر الإنترنت', 'success');
        clearCurrentDraft();
        setOffer(EMPTY_OFFER);
      }
      setLocalImageFile(null);
      setPendingItemId(null);
      setMediaResetKey((k) => k + 1);
      if (wasPending) navigate(`${baseRoute}/pending-uploads`);
      return;
    }

    setLoading(true);
    try {
      await api.post('/offers', payload);
      showNotice('تم نشر العرض بنجاح', 'success');
      invalidateCatalog(queryClient);
      clearCurrentDraft();
      setOffer(EMPTY_OFFER);
      setLocalImageFile(null);
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

  const { data: storeItems = [] } = useQuery({
    queryKey: queryKeys.myProducts,
    queryFn: async () => {
      const { data } = await api.get('/products/my?all=true');
      return unwrapList(data, ['products']);
    },
    staleTime: 60 * 1000,
    enabled: tab === 'offer',
  });

  const handleRelatedItemChange = (id) => {
    const item = storeItems.find((i) => i._id === id);
    setOffer((prev) => ({
      ...prev,
      relatedProductId: id || '',
      title: item?.name || prev.title,
      originalPrice: item?.price != null ? String(item.price) : prev.originalPrice,
      image: prev.image || item?.image || '',
      currency: item?.currency || prev.currency,
      offerType: prev.offerType || 'fixed_price',
    }));
  };

  const renderOfferFields = () => {
    switch (effectiveOfferType) {
      case 'discount':
        return (
          <>
            <NumericInput placeholder="السعر الأصلي *" value={offer.originalPrice} onChange={(v) => setOffer({ ...offer, originalPrice: v })} required />
            <NumericInput placeholder="نسبة الخصم % *" value={offer.value} onChange={(v) => setOffer({ ...offer, value: v })} max={100} required />
          </>
        );
      case 'fixed_price':
        return (
          <>
            <NumericInput placeholder="السعر القديم" value={offer.originalPrice} onChange={(v) => setOffer({ ...offer, originalPrice: v })} />
            <NumericInput placeholder="السعر الجديد *" value={offer.value} onChange={(v) => setOffer({ ...offer, value: v })} required />
          </>
        );
      case 'fixed_discount':
        return (
          <>
            <NumericInput placeholder="السعر الأصلي *" value={offer.originalPrice} onChange={(v) => setOffer({ ...offer, originalPrice: v })} required />
            <NumericInput placeholder="قيمة الخصم *" value={offer.value} onChange={(v) => setOffer({ ...offer, value: v })} required />
          </>
        );
      case 'bogo':
      case 'free_item':
        return (
          <NumericInput placeholder="سعر الشراء *" value={offer.originalPrice} onChange={(v) => setOffer({ ...offer, originalPrice: v })} required />
        );
      case 'custom':
        return (
          <NumericInput placeholder="السعر النهائي *" value={offer.finalPrice} onChange={(v) => setOffer({ ...offer, finalPrice: v })} required />
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
    if (offlineOfferPricing.valid && offlineOfferPricing.finalPrice != null) {
      return formatPriceWithUnit(offlineOfferPricing.finalPrice, offer.currency, offerUnit);
    }
    return '—';
  })();

  const toggleVariantExpanded = (index) => {
    setExpandedVariants((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const renderInventorySection = () => (
    <div className="variants-section">
      <div className="variants-section__header">
        <div>
          <p className="variants-section__title">متغيرات العنصر</p>
          <p className="variants-section__desc">فعّل المتغيرات لإضافة خيارات متعددة</p>
        </div>
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
        <div className="variants-section__body">
          <div className="variant-presets-card">
            <p className="variant-presets-card__label">إضافة سريعة</p>
            <div className="variant-presets">
              {VARIANT_PRESETS.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="variant-preset"
                  onClick={() => addVariant(name)}
                  disabled={activeData.variants.some((v) => v.name === name)}
                >
                  + {name}
                </button>
              ))}
            </div>
          </div>
          {activeData.variants.length === 0 ? (
            <div className="variants-empty-card">
              <p>لا توجد متغيرات بعد</p>
              <button type="button" className="ghost-btn" onClick={() => addVariant(`متغير ${activeData.variants.length + 1}`)}>
                + إضافة متغير
              </button>
            </div>
          ) : (
            <div className="variants-list">
              {activeData.variants.map((variant, index) => {
                const isOpen = expandedVariants[index] !== false;
                return (
                  <div key={`${variant.name}-${index}`} className="variant-card">
                    <button type="button" className="variant-card__head" onClick={() => toggleVariantExpanded(index)}>
                      <span className="variant-card__name">{variant.name || `متغير ${index + 1}`}</span>
                      <span className="variant-card__chevron">{isOpen ? '▾' : '◂'}</span>
                    </button>
                    {isOpen && (
                      <div className="variant-card__body">
                        <label className="field-label">اسم المتغير</label>
                        <input value={variant.name} onChange={(e) => updateVariant(index, { name: e.target.value })} placeholder="مثال: اللون" />
                        <label className="field-label">القيم</label>
                        <input value={variant.values} onChange={(e) => updateVariant(index, { values: e.target.value })} placeholder="أحمر، أزرق..." />
                        <button type="button" className="variant-remove" onClick={() => removeVariant(index)}>حذف المتغير</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
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
          disabled={loading || (!activeData.image?.trim() && !localImageFile)}
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
          <h2 className="title">{isEditMode ? (tab === 'product' ? 'تعديل العنصر' : 'تعديل العرض') : 'إنشاء منشور للمتجر'}</h2>
          <p className="page-lead">{isEditMode ? 'حدّث التفاصيل واحفظ التغييرات' : 'أضف عنصراً أو عرضاً بنفس سهولة نشر قصة'}</p>
        </div>
        <button type="button" className="rules-info-btn" onClick={() => setRulesOpen(true)}>
          ℹ️ القواعد
        </button>
      </div>

      {!isEditMode && (
      <div className="tabs">
        <button type="button" className={tab === 'product' ? 'active' : ''} onClick={() => { setTab('product'); setLocalImageFile(null); }}>
          إضافة عنصر
        </button>
        <button type="button" className={tab === 'offer' ? 'active' : ''} onClick={() => { setTab('offer'); setLocalImageFile(null); }}>
          إضافة عرض
        </button>
      </div>
      )}

      {tab === 'product' && (
        <form onSubmit={onFormSubmit} className="create-flow">
          <div className="form-card">
            <MediaUploader
              key={`product-media-${mediaResetKey}`}
              label="صور العنصر"
              value={product.image}
              onChange={(image) => setProduct((prev) => ({ ...prev, image }))}
              onLocalFileChange={(file) => setLocalImageFile(file)}
              onError={(msg) => showNotice(msg, 'error')}
              required
              emptyHint="أضف صورة العنصر"
            />
          </div>

          <div className="form-card">
            <label className="field-label">اسم العنصر *</label>
            <input
              value={product.name}
              onChange={(e) => setProduct({ ...product, name: e.target.value })}
              placeholder="مثال: حلويات مشكلة"
              required
            />

            <div className="form-card__divider" />

            <PriceUnitInput
              idPrefix="product-price-unit"
              unitType={product.priceUnitType}
              customUnit={product.priceUnitCustom}
              onUnitTypeChange={(value) => setProduct({ ...product, priceUnitType: value, priceUnitCustom: value === 'other' ? product.priceUnitCustom : '' })}
              onCustomUnitChange={(value) => setProduct({ ...product, priceUnitCustom: value })}
            />

            <div className="form-card__divider" />

            <label className="field-label">السعر *</label>
            <PriceCurrencyInput
              price={product.price}
              currency={product.currency}
              onPriceChange={(value) => setProduct({ ...product, price: value })}
              onCurrencyChange={(value) => setProduct({ ...product, currency: value })}
              pricePlaceholder="0.00"
              required
              className="price-currency-row"
            />

            <div className="form-card__divider" />

            <label className="field-label">الوصف</label>
            <textarea
              value={product.description}
              onChange={(e) => setProduct({ ...product, description: e.target.value })}
              placeholder="اكتب وصفاً مختصراً للعنصر..."
              rows={3}
            />
          </div>

          <CollapsibleSection
            title="إعدادات إضافية"
            subtitle="التصنيف، التوصيل، المتغيرات والوسوم"
            open={advancedOpen}
            onToggle={() => setAdvancedOpen((v) => !v)}
          >
            <ItemCategorySelect
              value={product.storeItemCategoryId}
              onChange={(id) => setProduct({ ...product, storeItemCategoryId: id || '' })}
              id="product-category"
            />
            <PurchaseModeSelect
              value={product.purchaseMode}
              onChange={(mode) => setProduct({ ...product, purchaseMode: mode })}
              id="product-purchase-mode"
            />
            <label className="field-label">التوصيل المجاني</label>
            <div className="radio-row">
              <label>
                <input type="radio" name="pDelivery" checked={product.freeDelivery === 'yes'} onChange={() => setProduct({ ...product, freeDelivery: 'yes' })} />
                نعم
              </label>
              <label>
                <input type="radio" name="pDelivery" checked={product.freeDelivery === 'no'} onChange={() => setProduct({ ...product, freeDelivery: 'no' })} />
                لا
              </label>
            </div>
            {renderInventorySection()}
            <TagsInput label="الوسوم" value={product.tags} onChange={(tags) => setProduct({ ...product, tags })} />
            {isEditMode && (
              <div className="availability-row">
                <span className="field-label">التوفر</span>
                <AvailabilitySwitch
                  id="product-availability"
                  checked={product.isActive !== false}
                  onChange={(checked) => setProduct({ ...product, isActive: checked })}
                />
                <span className="availability-row__hint">{product.isActive !== false ? 'متاح للزبائن' : 'غير متوفر حالياً'}</span>
              </div>
            )}
          </CollapsibleSection>

          {renderPublishSection()}
        </form>
      )}

      {tab === 'offer' && (
        <form onSubmit={onFormSubmit} className="create-flow">
          <div className="form-card">
            <MediaUploader
              key={`offer-media-${mediaResetKey}`}
              label="صورة العرض"
              value={offer.image}
              onChange={(image) => setOffer((prev) => ({ ...prev, image }))}
              onLocalFileChange={(file) => setLocalImageFile(file)}
              onError={(msg) => showNotice(msg, 'error')}
              required
              emptyHint="أضف صورة العرض"
            />
          </div>

          <div className="form-card">
            <RelatedItemSelect
              value={offer.relatedProductId}
              onChange={handleRelatedItemChange}
              required
            />

            <div className="form-card__divider" />

            <label className="field-label">سعر العرض *</label>
            <div className="price-with-unit-row">
              <PriceCurrencyInput
                price={offer.value}
                currency={offer.currency}
                onPriceChange={(value) => setOffer({ ...offer, value, offerType: 'fixed_price' })}
                onCurrencyChange={(value) => setOffer({ ...offer, currency: value })}
                pricePlaceholder="0.00"
                required
                className="price-currency-row"
              />
            </div>

            {(previewValid || offlineOfferPricing.valid) && resolvedOfferFinalPrice != null && (
              <div className="final-price-box">
                السعر النهائي: <strong>{previewPriceLabel}</strong>
              </div>
            )}

            <div className="form-card__divider" />

            <label className="field-label">وصف العرض</label>
            <textarea
              value={offer.description}
              onChange={(e) => setOffer({ ...offer, description: e.target.value })}
              placeholder="اشرح العرض للزبائن..."
              rows={3}
            />

            <div className="form-card__divider" />

            <label className="field-label" htmlFor="offer-expiry">تاريخ انتهاء العرض *</label>
            <input
              id="offer-expiry"
              type="date"
              className="date-field__input"
              value={offer.expiresAt}
              min={minExpiryDate()}
              onChange={(e) => setOffer({ ...offer, expiresAt: e.target.value })}
              required
            />
            {offer.expiresAt && (
              <p className="expiry-display">ينتهي: {formatExpiryDisplay(offer.expiresAt)}</p>
            )}
          </div>

          <CollapsibleSection
            title="إعدادات إضافية"
            subtitle="نوع العرض، التصنيف، التوصيل والوسوم"
            open={advancedOpen}
            onToggle={() => setAdvancedOpen((v) => !v)}
          >
            <label className="field-label">اسم العرض</label>
            <input
              value={offer.title}
              onChange={(e) => setOffer({ ...offer, title: e.target.value })}
              placeholder="يُملأ تلقائياً من العنصر"
            />
            <label className="field-label">نوع العرض</label>
            <select
              value={effectiveOfferType}
              onChange={(e) => setOffer({ ...offer, offerType: e.target.value, originalPrice: '', value: '', finalPrice: '' })}
            >
              {OFFER_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="type-fields">{renderOfferFields()}</div>
            <ItemCategorySelect
              value={offer.storeItemCategoryId}
              onChange={(id) => setOffer({ ...offer, storeItemCategoryId: id || '' })}
              id="offer-category"
            />
            <PriceUnitInput
              idPrefix="offer-price-unit"
              unitType={offer.priceUnitType}
              customUnit={offer.priceUnitCustom}
              onUnitTypeChange={(value) => setOffer({ ...offer, priceUnitType: value, priceUnitCustom: value === 'other' ? offer.priceUnitCustom : '' })}
              onCustomUnitChange={(value) => setOffer({ ...offer, priceUnitCustom: value })}
            />
            <label className="field-label">التوصيل المجاني</label>
            <div className="radio-row">
              <label>
                <input type="radio" name="oDelivery" checked={offer.freeDelivery === 'yes'} onChange={() => setOffer({ ...offer, freeDelivery: 'yes' })} />
                نعم
              </label>
              <label>
                <input type="radio" name="oDelivery" checked={offer.freeDelivery === 'no'} onChange={() => setOffer({ ...offer, freeDelivery: 'no' })} />
                لا
              </label>
            </div>
            {renderInventorySection()}
            <TagsInput label="الوسوم" value={offer.tags} onChange={(tags) => setOffer({ ...offer, tags })} />
            {isEditMode && (
              <div className="availability-row">
                <span className="field-label">التوفر</span>
                <AvailabilitySwitch
                  id="offer-availability"
                  checked={offer.isActive !== false}
                  onChange={(checked) => setOffer({ ...offer, isActive: checked })}
                />
                <span className="availability-row__hint">{offer.isActive !== false ? 'متاح للزبائن' : 'غير متوفر حالياً'}</span>
              </div>
            )}
          </CollapsibleSection>

          {renderPublishSection()}
        </form>
      )}

      <div className="form-page-links">
        <button type="button" className="link-btn" onClick={() => navigate(`${baseRoute}/drafts`)}>
          المسودات ←
        </button>
        <button type="button" className="link-btn" onClick={() => navigate(`${baseRoute}/my-store`)}>
          متجري ←
        </button>
      </div>

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
                <h4>{previewTitle?.trim() || (tab === 'product' ? 'اسم العنصر' : 'اسم العرض')}</h4>
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
