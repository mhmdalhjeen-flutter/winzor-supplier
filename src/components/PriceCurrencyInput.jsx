import React from 'react';
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY } from '../utils/currency';

export default function PriceCurrencyInput({
  price,
  currency = DEFAULT_CURRENCY,
  onPriceChange,
  onCurrencyChange,
  pricePlaceholder = 'السعر',
  required = false,
  currencyOnly = false,
  className = 'price-currency-row',
  inputClassName = '',
  selectClassName = '',
  inputProps = {},
}) {
  return (
    <div className={className}>
      {!currencyOnly && (
        <input
          type="number"
          min="0"
          step="any"
          required={required}
          value={price}
          onChange={(e) => onPriceChange(e.target.value)}
          placeholder={pricePlaceholder}
          className={inputClassName}
          {...inputProps}
        />
      )}
      <select
        value={currency || DEFAULT_CURRENCY}
        onChange={(e) => onCurrencyChange(e.target.value)}
        className={selectClassName}
        aria-label="العملة"
      >
        {CURRENCY_OPTIONS.map((item) => (
          <option key={item.code} value={item.code}>{item.label}</option>
        ))}
      </select>
    </div>
  );
}
