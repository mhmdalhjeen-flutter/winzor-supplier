import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader2, MapPin, Store } from 'lucide-react';
import '../styles/paymentSettings.css';
import '../styles/receivingSettings.css';
import { queryKeys } from '../lib/queryClient';
import { getMyStore, updateMyStore } from '../services/store.service';

const DEFAULT_RECEIVING = {
  freeNearbyDelivery: { enabled: true },
  storePickup: { enabled: true },
};

const RECEIVING_OPTIONS = [
  {
    key: 'freeNearbyDelivery',
    icon: MapPin,
    title: 'التوصيل المجاني للمناطق القريبة',
    description:
      'عند التفعيل يظهر للزبون خيار واحد: «توصيل مجاني | أنا قريب من المتجر». لا يُحسب القرب تلقائياً — أنت تراجع موقع الزبون وتقرر.',
    customerLabel: 'توصيل مجاني | أنا قريب من المتجر',
  },
  {
    key: 'storePickup',
    icon: Store,
    title: 'استلام الطلب من المتجر',
    description:
      'الزبون يطلب أولاً، المتجر يجهّز الطلب، ثم يأتي الزبون لاستلامه دون انتظار أثناء التحضير.',
    customerLabel: 'استلام الطلب من المتجر',
  },
];

export default function ReceivingSettings() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState({ text: '', isError: false });
  const [saving, setSaving] = useState(false);
  const [toggles, setToggles] = useState(DEFAULT_RECEIVING);

  const showMsg = (text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage({ text: '', isError: false }), 4000);
  };

  const { data: storeData, isLoading } = useQuery({
    queryKey: queryKeys.myStore,
    queryFn: async () => {
      const { data } = await getMyStore();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const rm = storeData?.store?.receivingMethods;
    if (rm) {
      setToggles({
        freeNearbyDelivery: { enabled: rm.freeNearbyDelivery?.enabled !== false },
        storePickup: { enabled: rm.storePickup?.enabled !== false },
      });
    }
  }, [storeData?.store?.receivingMethods]);

  const handleToggle = async (key, enabled) => {
    const next = {
      ...toggles,
      [key]: { enabled },
    };
    setToggles(next);
    setSaving(true);
    try {
      const { data } = await updateMyStore({ receivingMethods: next });
      queryClient.setQueryData(queryKeys.myStore, (prev) => ({
        ...(prev || {}),
        store: data.store,
      }));
      if (data?.store?.receivingMethods) {
        setToggles({
          freeNearbyDelivery: {
            enabled: data.store.receivingMethods.freeNearbyDelivery?.enabled !== false,
          },
          storePickup: {
            enabled: data.store.receivingMethods.storePickup?.enabled !== false,
          },
        });
      }
      showMsg('تم حفظ طرق الاستلام');
    } catch (err) {
      setToggles(toggles);
      showMsg(err.response?.data?.message || 'تعذّر حفظ الإعدادات', true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="payment-settings-page receiving-settings-page" dir="rtl">
      <header className="payment-settings-page__head">
        <div>
          <Link to="../profile" className="payment-settings-page__back">← العودة للملف الشخصي</Link>
          <h2 className="title">طرق الاستلام</h2>
          <p className="payment-settings-page__lead">
            اختر طرق الاستلام التي يظهرها متجرك للزبائن. شركات التوصيل مستقلة ولا تُدار من هنا.
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
          {RECEIVING_OPTIONS.map((opt) => {
            const enabled = toggles[opt.key]?.enabled !== false;
            const Icon = opt.icon;
            return (
              <section
                key={opt.key}
                className={`payment-method-block receiving-method-block${enabled ? ' is-enabled' : ''}`}
              >
                <div className="payment-method-block__head">
                  <div className="payment-method-block__title">
                    <span className="payment-method-block__icon receiving-method-block__icon">
                      <Icon size={22} strokeWidth={2.2} />
                    </span>
                    <div>
                      <h3>{opt.title}</h3>
                      <p>{opt.description}</p>
                      {enabled && (
                        <p className="receiving-method-block__customer">
                          يظهر للزبون: <strong>{opt.customerLabel}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                  <label className="switch" title={enabled ? 'إيقاف' : 'تفعيل'}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={saving}
                      onChange={(e) => handleToggle(opt.key, e.target.checked)}
                    />
                    <span className="switch__slider" />
                  </label>
                </div>
              </section>
            );
          })}

          <div className="receiving-settings-note">
            <p>
              خيار <strong>التوصيل عبر شركة دليفري</strong> يبقى متاحاً للزبائن بشكل مستقل عن إعدادات المتجر.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
