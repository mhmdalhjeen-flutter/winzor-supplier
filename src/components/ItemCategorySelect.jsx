import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { getMyItemCategories } from '../services/itemCategories.service';
import '../styles/itemCategories.css';

export default function ItemCategorySelect({ value, onChange, id = 'item-category' }) {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: queryKeys.storeItemCategories,
    queryFn: async () => {
      const { data } = await getMyItemCategories();
      return (data.categories || []).filter((c) => c.isActive !== false);
    },
    staleTime: 60 * 1000,
  });

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
      {!isLoading && categories.length === 0 && (
        <p className="item-category-select__hint">
          أنشئ أنواعاً من إعدادات المتجر ← الملف الشخصي ← أنواع العناصر
        </p>
      )}
    </div>
  );
}
