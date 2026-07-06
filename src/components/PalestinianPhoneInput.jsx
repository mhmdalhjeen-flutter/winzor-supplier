import {
  getPhoneCarrier,
  getPhoneInputStyle,
  LOCAL_PHONE_MESSAGE,
  LOCAL_PHONE_PLACEHOLDER,
  sanitizeLocalPhoneInput,
  isValidLocalPhone,
} from '../utils/phoneValidation';

export default function PalestinianPhoneInput({
  value,
  onValueChange,
  name,
  disabled = false,
  required = false,
}) {
  const carrier = getPhoneCarrier(value);
  const style = getPhoneInputStyle(carrier);
  const label = carrier === 'jawwal' ? 'جوال (059)' : carrier === 'wataniya' ? 'وطنية (056)' : null;

  return (
    <div className="input-group">
      <label>
        رقم الهاتف
        {label && (
          <span
            style={{
              marginInlineStart: 8,
              fontSize: 11,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 999,
              background: carrier === 'jawwal' ? '#dcfce7' : '#fee2e2',
              color: carrier === 'jawwal' ? '#15803d' : '#b91c1c',
            }}
          >
            {label}
          </span>
        )}
      </label>
      <input
        name={name}
        value={value}
        onChange={(e) => onValueChange(sanitizeLocalPhoneInput(e.target.value))}
        placeholder={LOCAL_PHONE_PLACEHOLDER}
        dir="ltr"
        inputMode="numeric"
        maxLength={10}
        pattern="05(6|9)[0-9]{7}"
        required={required}
        disabled={disabled}
        style={{ ...style, borderWidth: 2, borderStyle: 'solid' }}
      />
      <small style={{ color: carrier === 'jawwal' ? '#15803d' : carrier === 'wataniya' ? '#b91c1c' : '#64748b' }}>
        {isValidLocalPhone(value) ? `✓ 10 أرقام — ${label}` : LOCAL_PHONE_MESSAGE}
      </small>
    </div>
  );
}
