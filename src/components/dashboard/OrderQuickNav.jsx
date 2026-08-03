import { ClipboardList, PackageCheck, Truck, XCircle } from 'lucide-react';
import { ORDER_FILTER_KEYS, ORDER_FILTER_GROUPS } from '../../utils/storeOrderLabels';

const NAV_ITEMS = [
  {
    key: ORDER_FILTER_KEYS.PENDING,
    Icon: ClipboardList,
    color: '#f59e0b',
    bg: '#fffbeb',
  },
  {
    key: ORDER_FILTER_KEYS.CONFIRMED,
    Icon: PackageCheck,
    color: '#2563eb',
    bg: '#eff6ff',
  },
  {
    key: ORDER_FILTER_KEYS.DELIVERED,
    Icon: Truck,
    color: '#10b981',
    bg: '#ecfdf5',
  },
  {
    key: ORDER_FILTER_KEYS.REJECTED,
    Icon: XCircle,
    color: '#ef4444',
    bg: '#fef2f2',
  },
];

export default function OrderQuickNav({ activeFilter, onFilterChange, counts = {} }) {
  return (
    <div className="store-dash-quick-nav">
      <div className="store-dash-quick-nav__scroll">
        {NAV_ITEMS.map(({ key, Icon, color, bg }) => {
          const group = ORDER_FILTER_GROUPS[key];
          const count = counts[key] ?? 0;
          const isActive = activeFilter === key;

          return (
            <button
              key={key}
              type="button"
              className={`store-dash-quick-nav__item${isActive ? ' store-dash-quick-nav__item--active' : ''}`}
              onClick={() => onFilterChange(key)}
              aria-pressed={isActive}
            >
              <div
                className="store-dash-quick-nav__icon"
                style={{ background: bg, color }}
              >
                <Icon size={20} strokeWidth={2.2} />
              </div>
              <span className="store-dash-quick-nav__title">{group.label}</span>
              {count > 0 && (
                <span className="store-dash-quick-nav__badge">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
