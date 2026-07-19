/**
 * Optional collapsible card section for create forms.
 */
export default function CollapsibleSection({
  title,
  subtitle,
  badge,
  open,
  onToggle,
  children,
}) {
  return (
    <section className={`create-section create-section--collapsible ${open ? 'is-open' : ''}`}>
      <button type="button" className="create-section__toggle" onClick={onToggle} aria-expanded={open}>
        <div>
          <div className="create-section__title-row">
            <h3 className="create-section__title">{title}</h3>
            {badge && <span className="create-section__badge">{badge}</span>}
          </div>
          {subtitle && <p className="create-section__subtitle">{subtitle}</p>}
        </div>
        <span className="create-section__chevron" aria-hidden>{open ? '▾' : '◂'}</span>
      </button>
      {open && <div className="create-section__body">{children}</div>}
    </section>
  );
}
