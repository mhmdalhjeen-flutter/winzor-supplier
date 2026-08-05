import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';
import '../styles/paymentSettings.css';
import '../styles/AddProductsOffers.css';
import { queryKeys } from '../lib/queryClient';
import { getMyStore, updateMyStore } from '../services/store.service';
import {
  getMyPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  activatePaymentMethod,
  deletePaymentMethod,
} from '../services/paymentMethod.service';
import {
  PAYMENT_METHOD_TYPES,
  PAYMENT_TYPE_BY_ID,
  ALWAYS_AVAILABLE_PAYMENT_METHODS,
  DEFAULT_CURRENCY_PREFERENCES,
} from '../utils/paymentMethodConstants';
import PaymentAccountCard from '../components/paymentSettings/PaymentAccountCard';
import PaymentAccountForm from '../components/paymentSettings/PaymentAccountForm';
import CurrencyPreferencesSection from '../components/paymentSettings/CurrencyPreferencesSection';

export default function PaymentSettings() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState({ text: '', isError: false });
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [fixedType, setFixedType] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [savingForm, setSavingForm] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [currencyPrefs, setCurrencyPrefs] = useState(DEFAULT_CURRENCY_PREFERENCES);

  const showMsg = (text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage({ text: '', isError: false }), 4000);
  };

  const { data: storeData } = useQuery({
    queryKey: queryKeys.myStore,
    queryFn: async () => {
      const { data } = await getMyStore();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: paymentData, isLoading, refetch } = useQuery({
    queryKey: queryKeys.storePaymentMethods,
    queryFn: async () => {
      const { data } = await getMyPaymentMethods();
      return data;
    },
    staleTime: 30 * 1000,
  });

  const methods = paymentData?.methods || [];

  useEffect(() => {
    const prefs = storeData?.store?.currencyPreferences;
    if (prefs) setCurrencyPrefs({ ...DEFAULT_CURRENCY_PREFERENCES, ...prefs });
  }, [storeData?.store?.currencyPreferences]);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(PAYMENT_METHOD_TYPES.map((t) => [t.id, []]));
    methods.forEach((m) => {
      if (map[m.type]) map[m.type].push(m);
    });
    return map;
  }, [methods]);

  const activeByType = useMemo(() => {
    const map = {};
    methods.forEach((m) => {
      if (m.isActive) map[m.type] = true;
    });
    return map;
  }, [methods]);

  const activeDigitalCount = methods.filter((m) => m.isActive).length;

  const openAdd = (type) => {
    setEditingAccount(null);
    setFixedType(type);
    setFormOpen(true);
  };

  const openEdit = (account) => {
    setEditingAccount(account);
    setFixedType(account.type);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingAccount(null);
    setFixedType(null);
  };

  const handleSaveAccount = async (payload) => {
    if (!payload.accountName || !payload.accountNumber) {
      showMsg('اسم صاحب الحساب ورقم الحساب مطلوبان', true);
      return;
    }
    setSavingForm(true);
    try {
      if (editingAccount?._id) {
        await updatePaymentMethod(editingAccount._id, payload);
        showMsg('تم تحديث حساب الدفع');
      } else {
        await createPaymentMethod(payload);
        showMsg('تم إضافة حساب الدفع');
      }
      closeForm();
      await refetch();
    } catch (err) {
      showMsg(err.response?.data?.message || 'تعذّر حفظ الحساب', true);
    } finally {
      setSavingForm(false);
    }
  };

  const handleToggleActive = async (account) => {
    setBusyId(account._id);
    try {
      if (account.isActive) {
        await updatePaymentMethod(account._id, { isActive: false });
        showMsg('تم إيقاف الحساب');
      } else {
        await activatePaymentMethod(account._id);
        showMsg('تم تفعيل الحساب');
      }
      await refetch();
    } catch (err) {
      showMsg(err.response?.data?.message || 'تعذّر تحديث الحالة', true);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (account) => {
    if (!window.confirm(`حذف حساب «${account.accountName}»؟`)) return;
    setBusyId(account._id);
    try {
      await deletePaymentMethod(account._id);
      showMsg('تم حذف الحساب');
      await refetch();
    } catch (err) {
      showMsg(err.response?.data?.message || 'تعذّر الحذف', true);
    } finally {
      setBusyId(null);
    }
  };

  const handleCurrencyChange = (patch) => {
    setCurrencyPrefs((prev) => ({ ...prev, ...patch }));
  };

  const saveCurrencyPrefs = async () => {
    setSavingCurrency(true);
    try {
      const { data } = await updateMyStore({ currencyPreferences: currencyPrefs });
      queryClient.setQueryData(queryKeys.myStore, (prev) => ({
        ...(prev || {}),
        store: data.store,
      }));
      showMsg('تم حفظ تفضيلات العملات');
    } catch (err) {
      showMsg(err.response?.data?.message || 'تعذّر حفظ التفضيلات', true);
    } finally {
      setSavingCurrency(false);
    }
  };

  return (
    <div className="payment-settings-page" dir="rtl">
      <header className="payment-settings-page__head">
        <div>
          <Link to="../profile" className="payment-settings-page__back">← العودة للملف الشخصي</Link>
          <h2 className="title">إعدادات الدفع</h2>
          <p className="payment-settings-page__lead">
            أدر طرق الدفع التي تظهر للزبائن عند إتمام الطلب — نقداً، تفاهم، أو تحويل رقمي
          </p>
        </div>
      </header>

      {message.text && (
        <div className={message.isError ? 'alert-error' : 'alert-success'}>{message.text}</div>
      )}

      <section className="payment-overview" aria-labelledby="payment-overview-title">
        <div className="payment-overview__head">
          <h3 id="payment-overview-title">ملخص طرق الدفع</h3>
          <p>نظرة سريعة على ما هو متاح للزبائن الآن</p>
        </div>
        <div className="payment-overview__grid">
          {ALWAYS_AVAILABLE_PAYMENT_METHODS.map((method) => (
            <article key={method.id} className="payment-overview__card payment-overview__card--ready">
              <span className="payment-overview__icon">{method.icon}</span>
              <div className="payment-overview__body">
                <strong>{method.label}</strong>
                <span>متاحة دائماً</span>
              </div>
              <CheckCircle2 size={18} className="payment-overview__check" aria-hidden="true" />
            </article>
          ))}
          {PAYMENT_METHOD_TYPES.map((method) => {
            const ready = !!activeByType[method.id];
            return (
              <article
                key={method.id}
                className={`payment-overview__card${ready ? ' payment-overview__card--ready' : ''}`}
              >
                <span className="payment-overview__icon">{method.icon}</span>
                <div className="payment-overview__body">
                  <strong>{method.label}</strong>
                  <span>{ready ? 'حساب نشط' : 'بانتظار تفعيل حساب'}</span>
                </div>
                {ready ? (
                  <CheckCircle2 size={18} className="payment-overview__check" aria-hidden="true" />
                ) : (
                  <Circle size={18} className="payment-overview__idle" aria-hidden="true" />
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="payment-builtin-section" aria-labelledby="payment-builtin-title">
        <div className="payment-builtin-section__head">
          <h3 id="payment-builtin-title">طرق الدفع الأساسية</h3>
          <p>متاحة للزبائن تلقائياً دون إعداد حساب</p>
        </div>
        <div className="payment-builtin-section__list">
          {ALWAYS_AVAILABLE_PAYMENT_METHODS.map((method) => (
            <article key={method.id} className="payment-builtin-card">
              <div className="payment-builtin-card__icon">{method.icon}</div>
              <div>
                <h4>{method.label}</h4>
                <p>{method.description}</p>
              </div>
              <span className="payment-builtin-card__badge">مفعّلة</span>
            </article>
          ))}
        </div>
      </section>

      {activeDigitalCount === 0 && !isLoading && (
        <div className="payment-settings-page__notice">
          <p>لا يوجد حساب دفع رقمي نشط. أضف وفعّل حساباً واحداً على الأقل (بنك فلسطين / PalPay / Jawwal Pay) ليظهر للزبائن عند التحويل.</p>
        </div>
      )}

      {isLoading && (
        <div className="payment-settings-page__loading">
          <Loader2 className="animate-spin" size={28} />
        </div>
      )}

      {!isLoading && (
        <div className="payment-digital-block">
          <div className="payment-digital-block__head">
            <h3>حسابات الدفع الرقمي</h3>
            <p>حساب نشط واحد لكل نوع — يمكن إضافة عدة حسابات وتفعيل المطلوب</p>
          </div>

          {PAYMENT_METHOD_TYPES.map((typeMeta) => (
            <section key={typeMeta.id} className="payment-type-section">
              <div className="payment-type-section__head">
                <div>
                  <h3>{typeMeta.icon} {typeMeta.label}</h3>
                  <p>{typeMeta.description}</p>
                </div>
                <button type="button" className="payment-type-section__add" onClick={() => openAdd(typeMeta.id)}>
                  + إضافة حساب
                </button>
              </div>

              <div className="payment-type-section__cards">
                {(grouped[typeMeta.id] || []).length === 0 && (
                  <div className="payment-type-section__empty">
                    لا توجد حسابات — أضف حساب {typeMeta.label} ليظهر للزبائن
                  </div>
                )}
                {(grouped[typeMeta.id] || []).map((account) => (
                  <PaymentAccountCard
                    key={account._id}
                    account={account}
                    typeMeta={PAYMENT_TYPE_BY_ID[account.type] || typeMeta}
                    busy={busyId === account._id}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <CurrencyPreferencesSection
        preferences={currencyPrefs}
        saving={savingCurrency}
        onChange={handleCurrencyChange}
        onSave={saveCurrencyPrefs}
      />

      <PaymentAccountForm
        open={formOpen}
        initial={editingAccount}
        fixedType={fixedType}
        saving={savingForm}
        onClose={closeForm}
        onSubmit={handleSaveAccount}
        onError={(msg) => showMsg(msg, true)}
      />
    </div>
  );
}
