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

function itemKey(item) {
  return `${item?.itemType || ''}:${item?.itemId || ''}`;
}

function timeMs(value) {
  const t = value ? new Date(value).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

/**
 * Interleave conversation.referencedItems with messages by timestamp.
 * Context is stored on the conversation (addedAt), then the customer usually
 * sends the related comment immediately after — so each item is placed just
 * before the first message at/after addedAt.
 */
export function buildChatTimeline(messages = [], referencedItems = []) {
  const msgs = [...messages].sort((a, b) => timeMs(a.createdAt) - timeMs(b.createdAt));
  const items = [...referencedItems]
    .filter((item) => item?.itemId && item?.itemType)
    .sort((a, b) => timeMs(a.addedAt) - timeMs(b.addedAt));

  const seen = new Set();
  const uniqueItems = [];
  for (const item of items) {
    const key = itemKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueItems.push(item);
  }

  const timeline = [];
  let itemIdx = 0;

  for (const msg of msgs) {
    const msgTime = timeMs(msg.createdAt);
    while (itemIdx < uniqueItems.length && timeMs(uniqueItems[itemIdx].addedAt) <= msgTime) {
      timeline.push({ type: 'item', item: uniqueItems[itemIdx] });
      itemIdx += 1;
    }
    timeline.push({ type: 'message', msg });
  }

  while (itemIdx < uniqueItems.length) {
    timeline.push({ type: 'item', item: uniqueItems[itemIdx] });
    itemIdx += 1;
  }

  return timeline;
}

export function itemTypeIcon(type) {
  return TYPE_ICON[type] || '📦';
}
