import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { queryKeys } from '../lib/queryClient';
import { unwrapList } from '../utils/unwrapList';
import { formatPriceWithUnit } from '../utils/currency';

export default function RelatedItemSelect({ value, onChange, id = 'related-item', required = false }) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: queryKeys.myProducts,
    queryFn: async () => {
      const { data } = await api.get('/products/my?all=true');
      return unwrapList(data, ['products']);
    },
    staleTime: 60 * 1000,
  });

  return (
    <div className="related-item-select">
      <label className="field-label" htmlFor={id}>
        العنصر {required && <span className="req">*</span>}
      </label>
      <select
        id={id}
        className="related-item-select__dropdown"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={isLoading}
        required={required}
      >
        <option value="">— اختر عنصراً —</option>
        {items.map((item) => (
          <option key={item._id} value={item._id}>
            {item.name}
            {item.price != null ? ` — ${formatPriceWithUnit(item.price, item.currency, item.priceUnit)}` : ''}
          </option>
        ))}
      </select>
      {!isLoading && items.length === 0 && (
        <p className="related-item-select__hint">أضف عنصراً أولاً من تبويب «إضافة عنصر»</p>
      )}
    </div>
  );
}
