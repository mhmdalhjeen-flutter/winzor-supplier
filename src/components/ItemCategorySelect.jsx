import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { createItemCategory, getMyItemCategories } from '../services/itemCategories.service';
import '../styles/itemCategories.css';

const CREATE_OPTION_VALUE = '__create_item_type__';

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

  const resetCreate = ({ clearError = true } = {}) => {
    setCreating(false);
    setNewName('');
    setSaving(false);
    if (clearError) setError('');
  };

  const openCreate = () => {
    setCreating(true);
    setNewName('');
    setSaving(false);
    setError('');
  };

  const cancelCreate = () => {
    resetCreate();
  };

  const handleSelectChange = (e) => {
    const next = e.target.value;
    if (next === CREATE_OPTION_VALUE) {
      openCreate();
      return;
    }
    onChange(next || null);
  };

  const handleCreate = async (e) => {
    e?.preventDefault?.();
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
      <label className="field-label" htmlFor={creating ? `${id}-new-name` : id}>
        نوع العنصر
      </label>

      <div className="item-category-select__wrap">
        {creating ? (
          <div className="item-category-select__inline-create">
            <input
              id={`${id}-new-name`}
              type="text"
              className="item-category-select__input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreate(e);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelCreate();
                }
              }}
              placeholder="اكتب نوع العنصر..."
              maxLength={80}
              autoFocus
              disabled={saving}
            />
            <button
              type="button"
              className="item-category-select__submit"
              onClick={handleCreate}
              disabled={saving || !newName.trim()}
            >
              {saving ? 'جارٍ...' : 'أضف'}
            </button>
            <button
              type="button"
              className="item-category-select__cancel"
              onClick={cancelCreate}
              disabled={saving}
            >
              إلغاء
            </button>
          </div>
        ) : (
          <select
            id={id}
            className="item-category-select__dropdown"
            value={value || ''}
            onChange={handleSelectChange}
            disabled={isLoading}
          >
            <option value="">— بدون تصنيف —</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
            <option value={CREATE_OPTION_VALUE}>+ إضافة نوع</option>
          </select>
        )}
      </div>

      {error && <p className="item-category-select__error">{error}</p>}

      {!isLoading && categories.length === 0 && !creating && (
        <p className="item-category-select__hint">
          اختر &quot;+ إضافة نوع&quot; من القائمة أو أدر الأنواع من إعدادات المتجر
        </p>
      )}
    </div>
  );
}
