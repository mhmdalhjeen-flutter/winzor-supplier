import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, FileText, Package, Tag } from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { getStoredUser } from '../../utils/safeStorage';
import { listDrafts, deleteDraft } from '../../utils/draftsStorage';
import '../../styles/Drafts.css';

export default function Drafts() {
  const navigate = useNavigate();
  const user = getStoredUser({});
  const baseRoute = user?.role === 'supplier' ? '/supplier' : '/store';
  const [drafts, setDrafts] = useState(() => listDrafts());
  const [confirmDelete, setConfirmDelete] = useState(null);

  const grouped = useMemo(() => ({
    product: drafts.filter((d) => d.type === 'product'),
    offer: drafts.filter((d) => d.type === 'offer'),
  }), [drafts]);

  const refresh = () => setDrafts(listDrafts());

  const handleDelete = () => {
    if (!confirmDelete) return;
    deleteDraft(confirmDelete);
    refresh();
    setConfirmDelete(null);
  };

  const openDraft = (draft) => {
    navigate(`${baseRoute}/add-product-offer?draftId=${draft.id}&tab=${draft.type === 'product' ? 'product' : 'offer'}`);
  };

  const renderList = (items, emptyLabel) => {
    if (items.length === 0) {
      return <p className="drafts-empty">{emptyLabel}</p>;
    }
    return (
      <ul className="drafts-list">
        {items.map((draft) => (
          <li key={draft.id} className="drafts-card">
            <div className="drafts-card__media">
              {draft.imagePreview ? (
                <img src={draft.imagePreview} alt="" />
              ) : (
                <div className="drafts-card__placeholder">
                  {draft.type === 'product' ? <Package size={24} /> : <Tag size={24} />}
                </div>
              )}
            </div>
            <div className="drafts-card__body">
              <span className="drafts-card__type">{draft.type === 'product' ? 'عنصر' : 'عرض'}</span>
              <h3>{draft.title}</h3>
              <p className="drafts-card__date">
                {new Date(draft.updatedAt).toLocaleDateString('ar-EG', {
                  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
            <div className="drafts-card__actions">
              <button type="button" className="drafts-card__btn" onClick={() => openDraft(draft)} title="متابعة التعديل">
                <Pencil size={16} />
              </button>
              <button type="button" className="drafts-card__btn drafts-card__btn--delete" onClick={() => setConfirmDelete(draft.id)} title="حذف">
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="drafts-page" dir="rtl">
      <header className="drafts-page__head">
        <div>
          <h1 className="drafts-page__title">
            <FileText size={22} />
            المسودات
          </h1>
          <p className="drafts-page__subtitle">تابع تحرير المسودات أو انشرها لاحقاً</p>
        </div>
        <button type="button" className="drafts-page__add" onClick={() => navigate(`${baseRoute}/add-product-offer`)}>
          + إضافة جديد
        </button>
      </header>

      {drafts.length === 0 ? (
        <div className="drafts-page__empty">
          <FileText size={48} strokeWidth={1.2} />
          <p>لا توجد مسودات محفوظة</p>
          <button type="button" onClick={() => navigate(`${baseRoute}/add-product-offer`)}>
            إنشاء عنصر أو عرض
          </button>
        </div>
      ) : (
        <>
          <section className="drafts-section">
            <h2>مسودات العناصر ({grouped.product.length})</h2>
            {renderList(grouped.product, 'لا توجد مسودات عناصر')}
          </section>
          <section className="drafts-section">
            <h2>مسودات العروض ({grouped.offer.length})</h2>
            {renderList(grouped.offer, 'لا توجد مسودات عروض')}
          </section>
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="حذف المسودة"
        message="هل أنت متأكد من حذف هذه المسودة؟ لا يمكن استعادتها."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
