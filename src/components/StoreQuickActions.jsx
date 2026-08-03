import { PackagePlus, Tag, Store, Ticket } from 'lucide-react';

function QuickActionCard({ icon: Icon, title, description, tone, onClick }) {
  return (
    <button type="button" className={`quick-action-card quick-action-card--${tone}`} onClick={onClick}>
      <span className="quick-action-card__icon" aria-hidden>
        <Icon size={22} strokeWidth={2.2} />
      </span>
      <span className="quick-action-card__text">
        <span className="quick-action-card__title">{title}</span>
        {description ? <span className="quick-action-card__desc">{description}</span> : null}
      </span>
    </button>
  );
}

export default function StoreQuickActions({
  isSupplier = false,
  showBuyCodes = true,
  onAddProduct,
  onAddOffer,
  onMyStore,
  onBuyCodes,
}) {
  const storeLabel = isSupplier ? 'مستودعي' : 'متجري';
  const storeDesc = isSupplier ? 'إدارة المستودع والملف' : 'افتح ملف المتجر وإدارته';

  const items = [
    {
      id: 'product',
      icon: PackagePlus,
      title: 'إضافة عنصر',
      description: 'أنشئ عنصراً جديداً للمتجر',
      tone: 'blue',
      onClick: onAddProduct,
    },
    {
      id: 'offer',
      icon: Tag,
      title: 'إضافة عرض',
      description: 'انشر عرضاً جديداً لجذب الزبائن',
      tone: 'green',
      onClick: onAddOffer,
    },
    {
      id: 'store',
      icon: Store,
      title: storeLabel,
      description: storeDesc,
      tone: 'slate',
      onClick: onMyStore,
    },
    showBuyCodes && !isSupplier && {
      id: 'codes',
      icon: Ticket,
      title: 'شراء أكواد',
      description: 'اطلب أو اشترِ بطاقات الهدايا',
      tone: 'violet',
      onClick: onBuyCodes,
    },
  ].filter(Boolean);

  return (
    <section className="quick-actions" aria-label="الوصول السريع">
      <div className="quick-actions__head">
        <h3 className="sub-title quick-actions__title">الوصول السريع</h3>
        <p className="quick-actions__subtitle">اختصر الطريق إلى أهم إجراءات {isSupplier ? 'المستودع' : 'المتجر'}</p>
      </div>
      <div className="quick-actions__grid">
        {items.map((item) => (
          <QuickActionCard key={item.id} {...item} />
        ))}
      </div>
    </section>
  );
}
