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
  updatePaymentMethodToggles,
  createPaymentMethod,
  updatePaymentMethod,
  activatePaymentMethod,
  deletePaymentMethod,
} from '../services/paymentMethod.service';
import {
  ALL_PAYMENT_METHODS,
  DIGITAL_PAYMENT_METHODS,
  PAYMENT_TYPE_BY_ID,
  DEFAULT_PAYMENT_TOGGLES,
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
  const [savingToggles, setSavingToggles] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [toggles, setToggles] = useState(DEFAULT_PAYMENT_TOGGLES);
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
    if (paymentData?.paymentMethods) {
      setToggles({ ...DEFAULT_PAYMENT_TOGGLES, ...paymentData.paymentMethods });
    }
  }, [paymentData?.paymentMethods]);

  useEffect(() => {
    const prefs = storeData?.store?.currencyPreferences;
    if (prefs) setCurrencyPrefs({ ...DEFAULT_CURRENCY_PREFERENCES, ...prefs });
  }, [storeData?.store?.currencyPreferences]);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(DIGITAL_PAYMENT_METHODS.map((t) => [t.id, []]));
    methods.forEach((m) => {
      if (map[m.type]) map[m.type].push(m);
    });
    return map;
  }, [methods]);

  const handleToggleMethod = async (settingsKey, enabled) => {
    const next = {
      ...toggles,
      [settingsKey]: { enabled },
    };
    setToggles(next);
    setSavingToggles(true);
    try {
      const { data } = await updatePaymentMethodToggles(next);
      if (data?.paymentMethods) {
        setToggles({ ...DEFAULT_PAYMENT_TOGGLES, ...data.paymentMethods });
      }
      queryClient.setQueryData(queryKeys.storePaymentMethods, (prev) => ({
        ...(prev || {}),
        paymentMethods: data?.paymentMethods || next,
        methods: data?.methods ?? prev?.methods,
      }));
      queryClient.invalidateQueries({ queryKey: queryKeys.myStore });
    } catch (err) {
      setToggles(toggles);
      showMsg(err.response?.data?.message || 'تعذّر تحديث طريقة الدفع', true);
    } finally {
      setSavingToggles(false);
    }
  };

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
      queryClient.invalidateQueries({ queryKey: queryKeys.myStore });
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
      } else {
        await activatePaymentMethod(account._id);
      }
      await refetch();
      queryClient.invalidateQueries({ queryKey: queryKeys.myStore });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.myStore });
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
            فعّل طرق الدفع التي تريد إظهارها للزبائن. للطرق الإلكترونية أضف حساباً وفعّل واحداً فقط لكل نوع.
          </p>
        </div>
      </header>

      {message.text && (
        <div className={message.isError ? 'alert-error' : 'alert-success'}>{message.text}</div>
      )}

      {isLoading && (
        <div className="payment-settings-page__loading">
          <Loader2 className="animate-spin" size={28} />
        </div>
      )}

      {!isLoading && (
        <div className="payment-methods-list">
          {ALL_PAYMENT_METHODS.map((method) => {
            const enabled = toggles[method.settingsKey]?.enabled !== false;
            const accounts = method.requiresAccount ? (grouped[method.id] || []) : [];

            return (
              <section key={method.id} className={`payment-method-block${enabled ? ' is-enabled' : ''}`}>
                <div className="payment-method-block__head">
                  <div className="payment-method-block__title">
                    <span className="payment-method-block__icon">{method.icon}</span>
                    <div>
                      <h3>{method.label}</h3>
                      <p>{method.description}</p>
                    </div>
                  </div>
                  <label className="switch" title={enabled ? 'إيقاف' : 'تفعيل'}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={savingToggles}
                      onChange={(e) => handleToggleMethod(method.settingsKey, e.target.checked)}
                    />
                    <span className="switch__slider" />
                  </label>
                </div>

                {method.requiresAccount && enabled && (
                  <div className="payment-method-block__accounts">
                    <div className="payment-method-block__accounts-head">
                      <span>الحسابات المحفوظة</span>
                      <button type="button" className="payment-type-section__add" onClick={() => openAdd(method.id)}>
                        + إضافة حساب
                      </button>
                    </div>

                    {accounts.length === 0 && (
                      <div className="payment-type-section__empty">
                        لا توجد حسابات — أضف حساباً ليظهر للزبائن عند تفعيله
                      </div>
                    )}

                    <div className="payment-type-section__cards">
                      {accounts.map((account) => (
                        <PaymentAccountCard
                          key={account._id}
                          account={account}
                          typeMeta={PAYMENT_TYPE_BY_ID[account.type] || method}
                          busy={busyId === account._id}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                          onToggleActive={handleToggleActive}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
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
