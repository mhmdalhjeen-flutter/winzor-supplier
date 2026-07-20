import { PRICE_UNIT_OPTIONS } from '../utils/priceUnit';

export default function PriceUnitInput({
  unitType,
  customUnit,
  onUnitTypeChange,
  onCustomUnitChange,
  idPrefix = 'price-unit',
}) {
  return (
    <div className="price-unit-field">
      <label className="field-label" htmlFor={`${idPrefix}-select`}>الوحدة</label>
      <select
        id={`${idPrefix}-select`}
        value={unitType}
        onChange={(e) => onUnitTypeChange(e.target.value)}
      >
        <option value="">— اختر —</option>
        {PRICE_UNIT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {unitType === 'other' && (
        <input
          id={`${idPrefix}-custom`}
          type="text"
          maxLength={40}
          value={customUnit}
          onChange={(e) => onCustomUnitChange(e.target.value)}
          placeholder="أدخل الوحدة"
        />
      )}
    </div>
  );
}
