/** أدوات شجرة هرمية عامة — مناطق وتصنيفات (مصدر واحد مع لوحة الأدمن) */

export function buildHierarchyRows(tree, pathIds = []) {
  const rows = [{ items: tree || [], selectedId: pathIds[0] || null, level: 0 }];
  let current = tree || [];

  for (let i = 0; i < pathIds.length; i += 1) {
    const node = current.find((c) => String(c._id) === String(pathIds[i]));
    if (!node?.children?.length) break;
    current = node.children;
    rows.push({
      items: current,
      selectedId: pathIds[i + 1] || null,
      level: i + 1,
    });
  }

  return rows;
}

export function setHierarchyPath(pathIds, level, nodeId) {
  if (!nodeId) return pathIds.slice(0, level);
  return [...pathIds.slice(0, level), nodeId];
}

export function getLeafId(pathIds) {
  if (!pathIds?.length) return '';
  return String(pathIds[pathIds.length - 1]);
}

export function findTreeNode(nodes, id) {
  if (!id) return null;
  for (const node of nodes || []) {
    if (String(node._id) === String(id)) return node;
    const found = findTreeNode(node.children, id);
    if (found) return found;
  }
  return null;
}

export function pathToLabels(tree, pathIds) {
  return (pathIds || [])
    .map((id) => findTreeNode(tree, id)?.name)
    .filter(Boolean);
}
