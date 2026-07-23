import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Pencil, Trash2, Package, Tag } from 'lucide-react';
import {
  readPublishQueue,
  removePublishItem,
  getPreviewUrlForItem,
  getItemTitle,
} from '../../lib/offlinePublishQueue';
import { uploadPublishItemById, showAppToast } from '../../lib/offlinePublishSync';
import { offerTypeLabel } from '../../utils/offerPricing';
import { getStoredUser } from '../../utils/safeStorage';
import ConfirmDialog from '../../components/ConfirmDialog';
import '../../styles/PendingUploads.css';

const STATUS_LABELS = {
  pending: { text: 'بانتظار الرفع', className: 'pending-card__status--pending' },
  uploading: { text: 'جاري الرفع...', className: 'pending-card__status--uploading' },
  failed: { text: 'فشل الرفع', className: 'pending-card__status--failed' },
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ar-EG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function PendingUploads() {
  const navigate = useNavigate();
  const user = getStoredUser({});
  const baseRoute = user?.role === 'supplier' ? '/supplier' : '/store';

  const [items, setItems] = useState([]);
  const [thumbs, setThumbs] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const queue = await readPublishQueue();
      const active = queue.filter((i) => i.status !== 'synced');
      setItems(active);

      const nextThumbs = {};
      await Promise.all(active.map(async (item) => {
        nextThumbs[item.id] = await getPreviewUrlForItem(item);
      }));
      setThumbs(nextThumbs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    const onChange = () => loadQueue();
    window.addEventListener('offline-publish-queue-changed', onChange);
    return () => window.removeEventListener('offline-publish-queue-changed', onChange);
  }, [loadQueue]);

  const handleUploadNow = async (id) => {
    if (!navigator.onLine) {
      showAppToast('لا يوجد اتصال بالإنترنت', 'error');
      return;
    }
    setUploadingId(id);
    try {
      await uploadPublishItemById(id);
      await loadQueue();
    } catch (err) {
      showAppToast(err?.response?.data?.message || err?.message || 'فشل الرفع', 'error');
      await loadQueue();
    } finally {
      setUploadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await removePublishItem(confirmDelete.id);
      showAppToast('تم حذف الإضافة المعلقة', 'info');
      setConfirmDelete(null);
      await loadQueue();
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (item) => {
    navigate(`${baseRoute}/add-product-offer?pendingId=${item.id}`);
  };

  return (
    <div className="pending-uploads-page">
      <div className="pending-uploads-page__head">
        <div>
          <h2 className="title">الإضافات المعلقة</h2>
          <p className="page-lead">منتجات وعروض محفوظة محلياً — تُرفع تلقائياً عند توفر الإنترنت</p>
        </div>
      </div>

      {loading && items.length === 0 && (
        <p className="pending-uploads-empty">جاري التحميل...</p>
      )}

      {!loading && items.length === 0 && (
        <div className="pending-uploads-empty pending-uploads-empty--done">
          <Package size={40} strokeWidth={1.5} />
          <p>لا توجد إضافات معلقة</p>
          <span>كل شيء مرفوع — أنت جاهز!</span>
        </div>
      )}

      <div className="pending-uploads-list">
        {items.map((item) => {
          const status = STATUS_LABELS[item.status] || STATUS_LABELS.pending;
          const isProduct = item.type === 'product';
          const busy = uploadingId === item.id || item.status === 'uploading';

          return (
            <article key={item.id} className="pending-card">
              <div className="pending-card__thumb">
                {thumbs[item.id] ? (
                  <img src={thumbs[item.id]} alt="" />
                ) : (
                  <div className="pending-card__thumb-empty">
                    {isProduct ? <Package size={28} /> : <Tag size={28} />}
                  </div>
                )}
              </div>

              <div className="pending-card__body">
                <div className="pending-card__meta">
                  <span className={`pending-card__type pending-card__type--${item.type}`}>
                    {isProduct ? 'منتج' : 'عرض'}
                  </span>
                  {!isProduct && item.payload?.offerType && (
                    <span className="pending-card__subtype">{offerTypeLabel(item.payload.offerType)}</span>
                  )}
                </div>

                <h3 className="pending-card__title">{getItemTitle(item)}</h3>
                <p className="pending-card__date">أُنشئ: {formatDate(item.createdAt)}</p>

                <span className={`pending-card__status ${status.className}`}>
                  {item.status === 'failed' && item.error ? item.error : status.text}
                </span>
              </div>

              <div className="pending-card__actions">
                <button type="button" className="pending-action pending-action--edit" onClick={() => openEdit(item)}>
                  <Pencil size={16} strokeWidth={2.2} />
                  تعديل
                </button>
                <button
                  type="button"
                  className="pending-action pending-action--delete"
                  onClick={() => setConfirmDelete({ id: item.id, title: getItemTitle(item) })}
                >
                  <Trash2 size={16} strokeWidth={2.2} />
                  حذف
                </button>
                <button
                  type="button"
                  className="pending-action pending-action--upload"
                  disabled={busy}
                  onClick={() => handleUploadNow(item.id)}
                >
                  <Upload size={16} strokeWidth={2.2} />
                  {busy ? 'جاري الرفع...' : 'رفع الآن'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="حذف الإضافة المعلقة"
        message={confirmDelete ? `هل تريد حذف «${confirmDelete.title}» من قائمة الانتظار؟` : ''}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setConfirmDelete(null)}
      />
    </div>
  );
}
