/**
 * Independent ON/OFF feature row for create/edit forms.
 * When off, only the title + switch are shown; children expand when on.
 */
export default function FeatureToggleSection({
  title,
  description,
  enabled,
  onToggle,
  id,
  children,
}) {
  return (
    <div className={`feature-toggle${enabled ? ' is-on' : ''}`}>
      <div className="feature-toggle__header">
        <div>
          <p className="feature-toggle__title">{title}</p>
          {description ? <p className="feature-toggle__desc">{description}</p> : null}
        </div>
        <label className="feature-toggle__switch" htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            checked={!!enabled}
            onChange={(e) => onToggle?.(e.target.checked)}
          />
          <span className="feature-toggle__track" aria-hidden="true">
            <span className="feature-toggle__thumb" />
          </span>
          <span className="feature-toggle__state">{enabled ? 'تشغيل' : 'إيقاف'}</span>
        </label>
      </div>
      {enabled && children ? (
        <div className="feature-toggle__body">{children}</div>
      ) : null}
    </div>
  );
}
