import { Users, Clock, Ticket } from 'lucide-react';

const STAT_CONFIG = [
  {
    id: 'customers',
    label: 'عدد الزبائن',
    Icon: Users,
    color: '#3b82f6',
    bg: '#eff6ff',
  },
  {
    id: 'pending',
    label: 'طلبات بانتظار المراجعة',
    Icon: Clock,
    color: '#f59e0b',
    bg: '#fffbeb',
  },
  {
    id: 'cards',
    label: 'الكروت الرقمية المتبقية',
    Icon: Ticket,
    color: '#8b5cf6',
    bg: '#f5f3ff',
  },
];

export default function DashboardStatCards({ customersCount, pendingCount, cards, bypassCards, loading }) {
  const values = {
    customers: loading ? '…' : (customersCount ?? 0),
    pending: loading ? '…' : (pendingCount ?? 0),
    cards: loading ? '…' : (bypassCards ? '∞' : (cards ?? 0)),
  };

  const cardsColor = bypassCards ? '#10b981' : (cards ?? 0) > 0 ? '#8b5cf6' : '#ef4444';
  const cardsBg = bypassCards ? '#ecfdf5' : '#f5f3ff';

  return (
    <div className="store-dash-stats">
      {STAT_CONFIG.map((stat) => {
        const Icon = stat.Icon;
        const isCards = stat.id === 'cards';
        const iconColor = isCards ? cardsColor : stat.color;
        const iconBg = isCards ? cardsBg : stat.bg;

        return (
          <div key={stat.id} className="store-dash-stat-card">
            <div className="store-dash-stat-card__icon" style={{ background: iconBg, color: iconColor }}>
              <Icon size={18} strokeWidth={2.2} />
            </div>
            <div className="store-dash-stat-card__body">
              <span className="store-dash-stat-card__label">{stat.label}</span>
              <span className="store-dash-stat-card__value">{values[stat.id]}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
