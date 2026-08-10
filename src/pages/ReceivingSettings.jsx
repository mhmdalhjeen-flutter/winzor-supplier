import { useEffect, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Link } from 'react-router-dom';

import { Loader2, MapPin, Store } from 'lucide-react';

import '../styles/paymentSettings.css';

import '../styles/receivingSettings.css';

import { queryKeys } from '../lib/queryClient';

import { getMyStore, updateMyStore } from '../services/store.service';

import { getStoredUser } from '../utils/safeStorage';



const DEFAULT_RECEIVING = {

  freeNearbyDelivery: { enabled: true, note: '' },

  storePickup: { enabled: true, note: '' },

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

  const user = getStoredUser({});

  const baseRoute = user?.role === 'supplier' ? '/supplier' : '/store';

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

        freeNearbyDelivery: {

          enabled: rm.freeNearbyDelivery?.enabled !== false,

          note: rm.freeNearbyDelivery?.note || '',

        },

        storePickup: {

          enabled: rm.storePickup?.enabled !== false,

          note: rm.storePickup?.note || '',

        },

      });

    }

  }, [storeData?.store?.receivingMethods]);



  const persistReceivingMethods = async (next) => {

    setSaving(true);

    try {

      const { data } = await updateMyStore({ receivingMethods: next });

      queryClient.setQueryData(queryKeys.myStore, (prev) => ({

        ...(prev || {}),

        store: data.store,

      }));

      if (data?.store?.receivingMethods) {

        const rm = data.store.receivingMethods;

        setToggles({

          freeNearbyDelivery: {

            enabled: rm.freeNearbyDelivery?.enabled !== false,

            note: rm.freeNearbyDelivery?.note || '',

          },

          storePickup: {

            enabled: rm.storePickup?.enabled !== false,

            note: rm.storePickup?.note || '',

          },

        });

      }

      showMsg('تم حفظ طرق الاستلام');

    } catch (err) {

      throw err;

    } finally {

      setSaving(false);

    }

  };



  const handleToggle = async (key, enabled) => {

    const next = {

      ...toggles,

      [key]: { ...toggles[key], enabled },

    };

    setToggles(next);

    try {

      await persistReceivingMethods(next);

    } catch (err) {

      setToggles(toggles);

      showMsg(err.response?.data?.message || 'تعذّر حفظ الإعدادات', true);

    }

  };



  const handleNoteBlur = async (key) => {

    const note = String(toggles[key]?.note || '').trim();

    const previous = String(storeData?.store?.receivingMethods?.[key]?.note || '').trim();

    if (note === previous) return;

    try {

      await persistReceivingMethods(toggles);

    } catch (err) {

      showMsg(err.response?.data?.message || 'تعذّر حفظ الملاحظة', true);

    }

  };



  return (

    <div className="payment-settings-page receiving-settings-page" dir="rtl">

      <header className="payment-settings-page__head">

        <div>

          <Link to={`${baseRoute}/profile`} className="payment-settings-page__back">← العودة للملف الشخصي</Link>

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



                <label className="payment-method-block__note">

                  <span>ملاحظة للزبون (اختياري)</span>

                  <textarea

                    rows={2}

                    value={toggles[opt.key]?.note || ''}

                    disabled={saving}

                    placeholder="اتركها فارغة إن لم ترد إضافة ملاحظة."

                    onChange={(e) => setToggles((prev) => ({

                      ...prev,

                      [opt.key]: { ...prev[opt.key], note: e.target.value },

                    }))}

                    onBlur={() => handleNoteBlur(opt.key)}

                  />

                </label>

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

