import { getChatItemPath, itemTypeIcon } from '../utils/chatItemRoutes';

export default function ReferencedItemsBar({ items, onItemClick }) {
  if (!items?.length) return null;

  return (
    <div className="referenced-items-bar">
      <p className="referenced-items-label">عناصر مرتبطة بالمحادثة</p>
      <div className="referenced-items-scroll">
        {items.map((item) => {
          const key = `${item.itemType}:${item.itemId}`;
          return (
            <button
              key={key}
              type="button"
              className="referenced-item-chip"
              onClick={() => onItemClick(item)}
            >
              {item.itemImage ? (
                <img src={item.itemImage} alt="" className="referenced-item-img" />
              ) : (
                <span className="referenced-item-fallback">{itemTypeIcon(item.itemType)}</span>
              )}
              <span className="referenced-item-name">
                {itemTypeIcon(item.itemType)} {item.itemName || 'عنصر'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { getChatItemPath };
