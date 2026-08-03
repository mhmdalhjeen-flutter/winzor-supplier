import React from 'react';
import NumericInput from './NumericInput';
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
        <NumericInput
          required={required}
          value={price}
          onChange={onPriceChange}
          placeholder={pricePlaceholder}
          className={inputClassName}
          min={0}
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
