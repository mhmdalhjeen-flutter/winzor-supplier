const TYPE_ICON = {
  Product: '📦',
  Offer: '🎁',
  BazaarListing: '🏷️',
};

export function getChatItemPath(item, { role = 'customer', baseRoute = '/store' } = {}) {
  if (!item?.itemId) return null;
  const id = String(item.itemId);
  const type = item.itemType;

  if (role === 'customer') {
    if (type === 'Offer') return `/offer/${id}`;
    if (type === 'BazaarListing') return `/marketplace/${id}`;
    if (type === 'Product') return `/product/${id}`;
    return null;
  }

  // صاحب المتجر — داخل لوحة المتجر فقط
  if (type === 'Offer') return `${baseRoute}/item-details/${id}?type=offer`;
  if (type === 'Product') return `${baseRoute}/item-details/${id}?type=product`;
  return null;
}

export function getReferencedItems(conv) {
  if (conv?.referencedItems?.length) return conv.referencedItems;
  if (conv?.context?.itemId && conv?.context?.itemType) {
    return [conv.context];
  }
  return [];
}

export function itemTypeIcon(type) {
  return TYPE_ICON[type] || '📦';
}
