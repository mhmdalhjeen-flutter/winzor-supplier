import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
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
          <h2 className="title">💳 إعدادات الدفع</h2>
          <p className="payment-settings-page__lead">
            أضف حسابات الدفع التي ستظهر للزبائن عند إتمام الطلب
          </p>
        </div>
      </header>

      {message.text && (
        <div className={message.isError ? 'alert-error' : 'alert-success'}>{message.text}</div>
      )}

      {activeDigitalCount === 0 && !isLoading && (
        <div className="payment-settings-page__notice">
          <p>لا يوجد حساب دفع رقمي نشط. فعّل حساباً واحداً على الأقل ليظهر للزبائن.</p>
        </div>
      )}

      {isLoading && (
        <div className="payment-settings-page__loading">
          <Loader2 className="animate-spin" size={28} />
        </div>
      )}

      {!isLoading && PAYMENT_METHOD_TYPES.map((typeMeta) => (
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
                لا توجد حسابات — أضف حساب {typeMeta.label}
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
