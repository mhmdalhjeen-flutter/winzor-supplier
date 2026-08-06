/** Unified payment method definitions — mirrors backend registry. */

export const ACCOUNT_KINDS = [
  { id: 'merchant', label: 'تاجر' },
  { id: 'personal', label: 'شخصي' },
];

export const SIMPLE_PAYMENT_METHODS = [
  {
    id: 'cash_on_delivery',
    settingsKey: 'cashOnDelivery',
    label: 'الدفع عند التوصيل',
    icon: '💵',
    description: 'الزبون يدفع نقداً عند الاستلام',
    requiresAccount: false,
  },
  {
    id: 'seller_agreement',
    settingsKey: 'agreementWithStore',
    label: 'الاتفاق مع المتجر',
    icon: '🤝',
    description: 'اتفاق مخصص مع المتجر (دين، حساب شهري، أو أي ترتيب متفق عليه)',
    requiresAccount: false,
  },
];

export const DIGITAL_PAYMENT_METHODS = [
  {
    id: 'bank_palestine',
    settingsKey: 'bankPalestine',
    label: 'بنك فلسطين',
    icon: '🏦',
    description: 'تحويل بنكي عبر بنك فلسطين',
    requiresAccount: true,
  },
  {
    id: 'palpay',
    settingsKey: 'palPay',
    label: 'PalPay',
    icon: '💳',
    description: 'دفع عبر PalPay',
    requiresAccount: true,
  },
  {
    id: 'jawwal_pay',
    settingsKey: 'jawwalPay',
    label: 'Jawwal Pay',
    icon: '📱',
    description: 'دفع عبر Jawwal Pay',
    requiresAccount: true,
  },
];

/** @deprecated alias — prefer DIGITAL_PAYMENT_METHODS */
export const PAYMENT_METHOD_TYPES = DIGITAL_PAYMENT_METHODS;

export const ALL_PAYMENT_METHODS = [...SIMPLE_PAYMENT_METHODS, ...DIGITAL_PAYMENT_METHODS];

export const PAYMENT_TYPE_BY_ID = Object.fromEntries(
  DIGITAL_PAYMENT_METHODS.map((t) => [t.id, t]),
);

export const EMPTY_ACCOUNT_FORM = {
  type: 'bank_palestine',
  accountName: '',
  accountNumber: '',
  accountType: 'merchant',
  barcodeImage: '',
  isActive: true,
};

export const DEFAULT_PAYMENT_TOGGLES = {
  cashOnDelivery: { enabled: true },
  agreementWithStore: { enabled: true },
  bankPalestine: { enabled: true },
  palPay: { enabled: true },
  jawwalPay: { enabled: true },
};

export const DEFAULT_CURRENCY_PREFERENCES = {
  acceptsWornCurrency: true,
  acceptsOldCurrency: false,
  acceptsAllCurrencyTypes: false,
};

export function accountTypeLabel(kind) {
  return ACCOUNT_KINDS.find((k) => k.id === kind)?.label || 'تاجر';
}
