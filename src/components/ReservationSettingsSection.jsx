import {
  RESERVATION_FIELD_TYPES,
  createEmptyReservationField,
  isReservationNoteField,
  normalizeReservationSettings,
} from "../utils/reservationSettings";

export default function ReservationSettingsSection({
  value,
  onChange,
  idPrefix = "reservation",
  hideEnableToggle = false,
}) {
  const settings = normalizeReservationSettings(value);
  const showFields = hideEnableToggle || settings.enabled;

  const update = (patch) => {
    onChange?.({ ...settings, ...patch });
  };

  const updateField = (index, patch) => {
    update({
      fields: settings.fields.map((field, i) => (i === index ? { ...field, ...patch } : field)),
    });
  };

  const changeFieldType = (index, type) => {
    const field = settings.fields[index];
    const patch = { type };
    if (type === "note") {
      patch.required = false;
      if (!String(field.label || "").trim()) patch.label = "ملاحظة";
    }
    updateField(index, patch);
  };

  const addField = () => {
    update({
      fields: [...settings.fields, createEmptyReservationField(settings.fields.length)],
    });
  };

  const removeField = (index) => {
    update({
      fields: settings.fields.filter((_, i) => i !== index).map((field, i) => ({ ...field, order: i })),
    });
  };

  const moveField = (index, direction) => {
    const next = index + direction;
    if (next < 0 || next >= settings.fields.length) return;
    const fields = [...settings.fields];
    const [moved] = fields.splice(index, 1);
    fields.splice(next, 0, moved);
    update({ fields: fields.map((field, i) => ({ ...field, order: i })) });
  };

  return (
    <div className="reservation-settings">
      {!hideEnableToggle && (
        <div className="reservation-settings__header">
          <div>
            <p className="reservation-settings__title">السماح بالحجز</p>
            <p className="reservation-settings__desc">عند التفعيل يظهر للزبون زر احجز الآن بدل إضافة للسلة</p>
          </div>
          <label className="reservation-settings__switch" htmlFor={`${idPrefix}-enabled`}>
            <input
              id={`${idPrefix}-enabled`}
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
            />
            <span className="reservation-settings__track" aria-hidden="true">
              <span className="reservation-settings__thumb" />
            </span>
            <span className="reservation-settings__state">{settings.enabled ? "تشغيل" : "إيقاف"}</span>
          </label>
        </div>
      )}

      {showFields && (
        <div className="reservation-settings__fields">
          <p className="reservation-settings__fields-title">معلومات الحجز المطلوبة من الزبون</p>

          {settings.fields.map((field, index) => {
            const isNote = isReservationNoteField(field);
            return (
              <div key={field.id} className="reservation-field-card">
                {!isNote && (
                  <>
                    <label className="field-label" htmlFor={`${idPrefix}-label-${field.id}`}>اسم الحقل</label>
                    <input
                      id={`${idPrefix}-label-${field.id}`}
                      value={field.label}
                      onChange={(e) => updateField(index, { label: e.target.value })}
                      placeholder="مثال: الاسم"
                    />
                  </>
                )}

                <div className={`reservation-field-card__row${isNote ? " reservation-field-card__row--note" : ""}`}>
                  <div>
                    <label className="field-label" htmlFor={`${idPrefix}-type-${field.id}`}>النوع</label>
                    <select
                      id={`${idPrefix}-type-${field.id}`}
                      value={field.type}
                      onChange={(e) => changeFieldType(index, e.target.value)}
                    >
                      {RESERVATION_FIELD_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  {!isNote && (
                    <div>
                      <label className="field-label" htmlFor={`${idPrefix}-req-${field.id}`}>إلزامي</label>
                      <select
                        id={`${idPrefix}-req-${field.id}`}
                        value={field.required ? "required" : "optional"}
                        onChange={(e) => updateField(index, { required: e.target.value === "required" })}
                      >
                        <option value="required">مطلوب</option>
                        <option value="optional">اختياري</option>
                      </select>
                    </div>
                  )}
                </div>

                {isNote && (
                  <>
                    <label className="field-label" htmlFor={`${idPrefix}-content-${field.id}`}>نص الملاحظة</label>
                    <textarea
                      id={`${idPrefix}-content-${field.id}`}
                      rows={3}
                      value={field.content || ""}
                      onChange={(e) => updateField(index, { content: e.target.value })}
                      placeholder="مثال: يرجى الحضور قبل الموعد بـ 15 دقيقة"
                    />
                  </>
                )}

                <div className="reservation-field-card__actions">
                  <button type="button" onClick={() => moveField(index, -1)} disabled={index === 0}>↑</button>
                  <button type="button" onClick={() => moveField(index, 1)} disabled={index === settings.fields.length - 1}>↓</button>
                  <button type="button" className="reservation-field-card__remove" onClick={() => removeField(index)}>
                    {isNote ? "حذف الملاحظة" : "حذف الحقل"}
                  </button>
                </div>
              </div>
            );
          })}

          <button type="button" className="reservation-settings__add" onClick={addField}>
            + إضافة حقل
          </button>
        </div>
      )}
    </div>
  );
}
