export default function CurrencyPreferencesSection({ preferences, saving, onChange, onSave }) {
  const prefs = preferences || {};

  return (
    <section className="currency-prefs" aria-labelledby="currency-prefs-title">
      <h3 id="currency-prefs-title">تفضيلات العملات</h3>
      <p className="currency-prefs__lead">حدد أنواع العملات التي يقبلها متجرك</p>

      <div className="currency-prefs__list">
        <div className="currency-prefs__item">
          <div>
            <strong>يتعامل بالعملة المهترئة</strong>
            <span>قبول العملات البالية أو المستعملة</span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={prefs.acceptsWornCurrency !== false}
              onChange={(e) => onChange({ acceptsWornCurrency: e.target.checked })}
            />
            <span className="switch__slider" />
          </label>
        </div>

        <div className="currency-prefs__item">
          <div>
            <strong>يتعامل بالعملة القديمة</strong>
            <span>قبول الإصدارات القديمة من العملة</span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={!!prefs.acceptsOldCurrency}
              onChange={(e) => onChange({ acceptsOldCurrency: e.target.checked })}
            />
            <span className="switch__slider" />
          </label>
        </div>

        <div className="currency-prefs__item">
          <div>
            <strong>يتعامل مع جميع أنواع العملات</strong>
            <span>ILS، JOD، USD وغيرها</span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={!!prefs.acceptsAllCurrencyTypes}
              onChange={(e) => onChange({ acceptsAllCurrencyTypes: e.target.checked })}
            />
            <span className="switch__slider" />
          </label>
        </div>
      </div>

      <button type="button" className="save-btn currency-prefs__save" disabled={saving} onClick={onSave}>
        {saving ? 'جارٍ الحفظ...' : 'حفظ تفضيلات العملات'}
      </button>
    </section>
  );
}
