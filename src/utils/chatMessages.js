/** دمج رسائل السيرفر مع الرسائل المحلية (optimistic / قيد الإرسال) */
export function mergeChatMessages(serverList, localList) {
  const server = Array.isArray(serverList) ? serverList : [];
  const local = Array.isArray(localList) ? localList : [];
  const serverIds = new Set(server.map((m) => String(m._id)));

  const extras = [];
  for (const m of local) {
    const id = String(m._id);
    if (serverIds.has(id)) continue;
    if (id.startsWith('tmp-')) {
      extras.push(m);
      continue;
    }
    const created = new Date(m.createdAt).getTime();
    if (!Number.isNaN(created) && Date.now() - created < 20000) {
      extras.push(m);
    }
  }

  const merged = [...server, ...extras];
  merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return merged;
}

export function messagesShallowEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (String(a[i]._id) !== String(b[i]._id)) return false;
    if (a[i].read !== b[i].read) return false;
    if (a[i].text !== b[i].text) return false;
    if (Boolean(a[i].image) !== Boolean(b[i].image)) return false;
  }
  return true;
}
