import { normalizePurchaseMode, purchaseModeLabel } from '../utils/purchaseMode';
import '../styles/purchaseMode.css';

const OPTIONS = [
  { value: 'quantity', label: 'بالكمية فقط', desc: 'الزبون يختار عدد الوحدات' },
  { value: 'price', label: 'بالقيمة فقط', desc: 'مثل: بزر بـ 7 شيكل' },
  { value: 'both', label: 'الاثنان', desc: 'يختار الزبون الطريقة المناسبة' },
];

export default function PurchaseModeSelect({ value, onChange, id = 'purchase-mode' }) {
  const mode = normalizePurchaseMode(value);

  return (
    <div className="purchase-mode-select">
      <label className="field-label" htmlFor={id}>طريقة الشراء</label>
      <div className="purchase-mode-select__options" role="radiogroup" aria-labelledby={id}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            id={opt.value === mode ? id : undefined}
            className={`purchase-mode-select__option${mode === opt.value ? ' active' : ''}`}
            onClick={() => onChange(opt.value)}
            aria-pressed={mode === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="purchase-mode-select__hint">{purchaseModeLabel(mode)} — {OPTIONS.find((o) => o.value === mode)?.desc}</p>
    </div>
  );
}
