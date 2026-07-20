export const PRICE_UNIT_OPTIONS = [
  { value: 'kilo', label: 'كيلو' },
  { value: 'ounce', label: 'وقية' },
  { value: 'piece', label: 'قطعة' },
  { value: 'other', label: 'أخرى' },
];

const UNIT_LABELS = {
  kilo: 'كيلو',
  ounce: 'وقية',
  piece: 'قطعة',
};

const STORED_TO_TYPE = {
  كيلو: 'kilo',
  وقية: 'ounce',
  قطعة: 'piece',
};

export function resolvePriceUnit(unitType, customUnit) {
  if (!unitType) return '';
  if (unitType === 'other') return customUnit?.trim() || '';
  return UNIT_LABELS[unitType] || '';
}

export function parsePriceUnit(stored) {
  if (!stored) return { priceUnitType: '', priceUnitCustom: '' };
  const type = STORED_TO_TYPE[stored];
  if (type) return { priceUnitType: type, priceUnitCustom: '' };
  return { priceUnitType: 'other', priceUnitCustom: stored };
}
