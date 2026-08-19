import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { createItemCategory, getMyItemCategories } from '../services/itemCategories.service';
import '../styles/itemCategories.css';

export default function ItemCategorySelect({ value, onChange, id = 'item-category' }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: queryKeys.storeItemCategories,
    queryFn: async () => {
      const { data } = await getMyItemCategories();
      return (data.categories || []).filter((c) => c.isActive !== false);
    },
    staleTime: 60 * 1000,
  });

  const resetCreate = () => {
    setCreating(false);
    setNewName('');
    setSaving(false);
    setError('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name || saving) return;
    setSaving(true);
    setError('');
    try {
      const { data } = await createItemCategory({ name });
      const category = data.category;
      await queryClient.invalidateQueries({ queryKey: queryKeys.storeItemCategories });
      if (category?._id) {
        queryClient.setQueryData(queryKeys.storeItemCategories, (prev = []) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((item) => item._id === category._id)) return list;
          return [...list, category];
        });
        onChange(category._id);
      }
      resetCreate();
    } catch (err) {
      setError(err.response?.data?.message || 'تعذّر إضافة النوع');
      setSaving(false);
    }
  };

  return (
    <div className="item-category-select">
      <label className="field-label" htmlFor={id}>نوع العنصر</label>
      <div className="item-category-select__wrap">
        <select
          id={id}
          className="item-category-select__dropdown"
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={isLoading}
        >
          <option value="">— بدون تصنيف —</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {creating ? (
        <form className="item-category-select__create" onSubmit={handleCreate}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="اكتب اسم النوع"
            maxLength={80}
            autoFocus
            disabled={saving}
          />
          <button type="submit" disabled={saving || !newName.trim()}>
            {saving ? 'جارٍ...' : 'أضف'}
          </button>
          <button type="button" className="muted" onClick={resetCreate} disabled={saving}>
            إلغاء
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="item-category-select__add"
          onClick={() => { setCreating(true); setError(''); }}
        >
          + إضافة نوع
        </button>
      )}

      {error && <p className="item-category-select__error">{error}</p>}

      {!isLoading && categories.length === 0 && !creating && (
        <p className="item-category-select__hint">
          أنشئ أنواعاً من هنا أو من إعدادات المتجر ← الملف الشخصي ← أنواع العناصر
        </p>
      )}
    </div>
  );
}
