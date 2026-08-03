import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import AvailabilitySwitch from './AvailabilitySwitch';
import ConfirmDialog from './ConfirmDialog';
import {
  getMyItemCategories,
  createItemCategory,
  updateItemCategory,
  deleteItemCategory,
} from '../services/itemCategories.service';
import { queryKeys } from '../lib/queryClient';
import '../styles/itemCategories.css';

export default function ItemCategoriesSection({ embedded = false }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [message, setMessage] = useState({ text: '', isError: false });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: queryKeys.storeItemCategories,
    queryFn: async () => {
      const { data } = await getMyItemCategories();
      return data.categories || [];
    },
    staleTime: 60 * 1000,
  });

  const showMsg = (text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage({ text: '', isError: false }), 3500);
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.storeItemCategories });

  const handleAdd = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await createItemCategory({ name });
      setNewName('');
      refresh();
      showMsg('تم إضافة النوع');
    } catch (err) {
      showMsg(err.response?.data?.message || 'تعذّر الإضافة', true);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat._id);
    setEditName(cat.name);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const name = editName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await updateItemCategory(editingId, { name });
      setEditingId(null);
      refresh();
      showMsg('تم تحديث النوع');
    } catch (err) {
      showMsg(err.response?.data?.message || 'تعذّر التحديث', true);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (cat, isActive) => {
    setBusy(true);
    try {
      await updateItemCategory(cat._id, { isActive });
      refresh();
    } catch (err) {
      showMsg(err.response?.data?.message || 'تعذّر التحديث', true);
    } finally {
      setBusy(false);
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await deleteItemCategory(confirmDelete);
      refresh();
      setConfirmDelete(null);
      showMsg('تم حذف النوع');
    } catch (err) {
      showMsg(err.response?.data?.message || 'تعذّر الحذف', true);
    } finally {
      setBusy(false);
    }
  };

  const content = (
    <>
      {!embedded && (
        <div className="item-categories-section__head">
          <h3>أنواع العناصر</h3>
          <p>أنشئ تصنيفات خاصة بمتجرك لتنظيم العناصر والعروض</p>
        </div>
      )}

      {message.text && (
        <div className={message.isError ? 'alert-error' : 'alert-success'}>{message.text}</div>
      )}

      <form className="item-categories-add" onSubmit={handleAdd}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="مثال: حلويات، مكسرات..."
          maxLength={80}
        />
        <button type="submit" disabled={busy || !newName.trim()}>
          <Plus size={18} />
          إضافة
        </button>
      </form>

      {isLoading && <p className="item-categories-loading">جاري التحميل...</p>}

      {!isLoading && categories.length === 0 && (
        <p className="item-categories-empty">لا توجد أنواع بعد — أضف نوعاً لتصنيف عناصرك</p>
      )}

      <ul className="item-categories-list">
        {categories.map((cat) => (
          <li key={cat._id} className="item-categories-row">
            {editingId === cat._id ? (
              <div className="item-categories-edit">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                />
                <button type="button" onClick={saveEdit} disabled={busy}>حفظ</button>
                <button type="button" className="muted" onClick={() => setEditingId(null)}>إلغاء</button>
              </div>
            ) : (
              <>
                <span className="item-categories-row__name">{cat.name}</span>
                <AvailabilitySwitch
                  id={`cat-active-${cat._id}`}
                  checked={cat.isActive !== false}
                  disabled={busy}
                  onChange={(next) => toggleActive(cat, next)}
                />
                <div className="item-categories-row__actions">
                  <button type="button" onClick={() => startEdit(cat)} title="تعديل">
                    <Pencil size={16} />
                  </button>
                  <button type="button" className="danger" onClick={() => setConfirmDelete(cat._id)} title="حذف">
                    <Trash2 size={16} />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="حذف النوع"
        message="هل أنت متأكد من حذف هذا النوع؟ لن تُحذف العناصر المرتبطة به."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        danger
        loading={busy}
        onConfirm={executeDelete}
        onCancel={() => !busy && setConfirmDelete(null)}
      />
    </>
  );

  if (embedded) {
    return <div className="item-categories-section item-categories-section--embedded">{content}</div>;
  }

  return (
    <section className="item-categories-section" id="item-categories">
      {content}
    </section>
  );
}
