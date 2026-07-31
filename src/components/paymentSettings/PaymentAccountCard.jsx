export default function PaymentAccountCard({
  account,
  typeMeta,
  busy = false,
  onEdit,
  onDelete,
  onToggleActive,
}) {
  return (
    <article className={`payment-account-card${account.isActive ? ' payment-account-card--active' : ''}`}>
      <header className="payment-account-card__head">
        <div className="payment-account-card__icon">{typeMeta?.icon || '💳'}</div>
        <div className="payment-account-card__titles">
          <h4>{account.accountName}</h4>
          <span>{typeMeta?.label || account.type}</span>
        </div>
        <span className={`payment-account-card__status${account.isActive ? ' is-active' : ''}`}>
          {account.isActive ? 'نشط' : 'غير نشط'}
        </span>
      </header>

      <div className="payment-account-card__body">
        <div className="payment-account-card__row">
          <span>رقم الحساب</span>
          <strong dir="ltr">{account.accountNumber}</strong>
        </div>
        {account.iban && (
          <div className="payment-account-card__row">
            <span>IBAN</span>
            <strong dir="ltr">{account.iban}</strong>
          </div>
        )}
        {account.barcodeImage && (
          <div className="payment-account-card__qr">
            <img src={account.barcodeImage} alt="QR" />
          </div>
        )}
      </div>

      <footer className="payment-account-card__foot">
        <label className="switch payment-account-card__switch" title={account.isActive ? 'إيقاف' : 'تفعيل'}>
          <input
            type="checkbox"
            checked={account.isActive}
            disabled={busy}
            onChange={() => onToggleActive(account)}
          />
          <span className="switch__slider" />
        </label>

        <div className="payment-account-card__actions">
          <button type="button" className="payment-account-card__edit" disabled={busy} onClick={() => onEdit(account)}>
            تعديل
          </button>
          <button type="button" className="payment-account-card__delete" disabled={busy} onClick={() => onDelete(account)}>
            حذف
          </button>
        </div>
      </footer>
    </article>
  );
}
