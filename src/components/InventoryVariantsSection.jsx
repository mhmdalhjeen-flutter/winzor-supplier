import { useState } from 'react';

const VARIANT_EXAMPLES = ['اللون', 'المقاس', 'السعة', 'النوع'];

/**
 * Optional inventory & variants UX (local form state only — not sent to API).
 */
export default function InventoryVariantsSection({ value, onChange }) {
  const data = value || { sku: '', quantity: '', variantsEnabled: false, variants: [] };

  const update = (patch) => onChange?.({ ...data, ...patch });

  const addVariant = (name) => {
    const label = String(name || '').trim();
    if (!label) return;
    if (data.variants.some((v) => v.name === label)) return;
    update({
      variantsEnabled: true,
      variants: [...data.variants, { name: label, values: '' }],
    });
  };

  const updateVariant = (index, patch) => {
    const variants = data.variants.map((v, i) => (i === index ? { ...v, ...patch } : v));
    update({ variants });
  };

  const removeVariant = (index) => {
    update({ variants: data.variants.filter((_, i) => i !== index) });
  };

  const [customName, setCustomName] = useState('');

  return (
    <div className="inventory-section">
      <div className="inventory-grid">
        <div className="field-block">
          <label className="field-label">رمز العنصر (SKU)</label>
          <input
            value={data.sku}
            onChange={(e) => update({ sku: e.target.value })}
            placeholder="اختياري — للتتبع الداخلي"
          />
        </div>
        <div className="field-block">
          <label className="field-label">الكمية المتوفرة</label>
          <input
            type="number"
            min="0"
            step="1"
            value={data.quantity}
            onChange={(e) => update({ quantity: e.target.value })}
            placeholder="عدد القطع (اختياري)"
          />
        </div>
      </div>

      <div className="variants-toggle-row">
        <label className="switch-label">
          <input
            type="checkbox"
            checked={data.variantsEnabled}
            onChange={(e) => update({ variantsEnabled: e.target.checked })}
          />
          <span>تفعيل خيارات العنصر (اللون، المقاس، ...)</span>
        </label>
      </div>

      {data.variantsEnabled && (
        <div className="variants-box">
          <div className="tags-examples">
            {VARIANT_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="tag-example"
                onClick={() => addVariant(ex)}
                disabled={data.variants.some((v) => v.name === ex)}
              >
                {ex}
              </button>
            ))}
          </div>

          <div className="variant-add-row">
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="خيار مخصص..."
            />
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                addVariant(customName);
                setCustomName('');
              }}
            >
              إضافة
            </button>
          </div>

          {data.variants.map((variant, index) => (
            <div key={`${variant.name}-${index}`} className="variant-row">
              <div className="variant-row__name">{variant.name}</div>
              <input
                value={variant.values}
                onChange={(e) => updateVariant(index, { values: e.target.value })}
                placeholder="القيم مفصولة بفاصلة — مثال: أحمر، أزرق"
              />
              <button type="button" className="text-danger-btn" onClick={() => removeVariant(index)}>
                حذف
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
