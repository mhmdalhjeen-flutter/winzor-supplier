import { useCallback } from 'react';

/**
 * Text-based decimal input — avoids browser number-input quirks
 * (values changing on blur, losing decimals, etc.).
 */
export default function NumericInput({
  value = '',
  onChange,
  placeholder,
  required = false,
  min,
  max,
  className = '',
  id,
  disabled = false,
  'aria-label': ariaLabel,
}) {
  const handleChange = useCallback((e) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange('');
      return;
    }
    const normalized = raw.replace(/,/g, '.').replace(/[^\d.]/g, '');
    const parts = normalized.split('.');
    const sanitized = parts.length > 1
      ? `${parts[0]}.${parts.slice(1).join('')}`
      : normalized;
    onChange(sanitized);
  }, [onChange]);

  const handleBlur = useCallback(() => {
    if (value === '' || value === '.') {
      if (value === '.') onChange('');
      return;
    }
    const num = Number(value);
    if (Number.isNaN(num)) {
      onChange('');
      return;
    }
    if (min != null && num < min) onChange(String(min));
    else if (max != null && num > max) onChange(String(max));
  }, [value, onChange, min, max]);

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={className}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      aria-label={ariaLabel}
    />
  );
}
