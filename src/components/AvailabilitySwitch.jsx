export default function AvailabilitySwitch({ checked, onChange, disabled = false, id }) {
  return (
    <label className="availability-switch" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="availability-switch__input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="availability-switch__track" aria-hidden="true">
        <span className="availability-switch__thumb" />
      </span>
      <span className="availability-switch__label">
        {checked ? 'متوفر' : 'غير متوفر'}
      </span>
    </label>
  );
}
