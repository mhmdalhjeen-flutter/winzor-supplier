/** Digital payment types — mirrors backend registry. */
export const PAYMENT_METHOD_TYPES = [
  {
    id: 'bank_palestine',
    label: 'بنك فلسطين',
    icon: '🏦',
    description: 'حسابات بنك فلسطين للتحويل',
  },
  {
    id: 'palpay',
    label: 'PalPay',
    icon: '💳',
    description: 'حسابات PalPay للدفع الرقمي',
  },
  {
    id: 'jawwal_pay',
    label: 'Jawwal Pay',
    icon: '📱',
    description: 'حسابات Jawwal Pay للدفع الرقمي',
  },
];

export const PAYMENT_TYPE_BY_ID = Object.fromEntries(
  PAYMENT_METHOD_TYPES.map((t) => [t.id, t]),
);

export const EMPTY_ACCOUNT_FORM = {
  type: 'bank_palestine',
  accountName: '',
  accountNumber: '',
  iban: '',
  barcodeImage: '',
  isActive: true,
};

export const DEFAULT_CURRENCY_PREFERENCES = {
  acceptsWornCurrency: true,
  acceptsOldCurrency: false,
  acceptsAllCurrencyTypes: false,
};
