import { buildHierarchyRows, setHierarchyPath, pathToLabels } from "../utils/hierarchyTree";

/**
 * قوائم منسدلة متعددة المستويات — تُبنى ديناميكياً من شجرة الأدمن.
 * المستوى الأول إلزامي؛ الباقي يظهر فقط عند وجود أبناء.
 */
export default function HierarchySelect({
  label,
  tree,
  pathIds,
  onChange,
  loading = false,
  error = null,
  onRetry,
  firstPlaceholder = "اختر...",
  optionalPlaceholder = "اختياري — مستوى أدق",
}) {
  const rows = buildHierarchyRows(tree, pathIds);
  const labels = pathToLabels(tree, pathIds);

  const handleSelect = (level, value) => {
    onChange(setHierarchyPath(pathIds, level, value || null));
  };

  return (
    <div className="hierarchy-select-group">
      {label && <label className="hierarchy-label">{label}</label>}

      {loading && <p className="hierarchy-hint">جارٍ التحميل...</p>}

      {!loading && error && (
        <div className="hierarchy-error">
          <span>تعذّر تحميل البيانات</span>
          {onRetry && (
            <button type="button" onClick={onRetry}>إعادة المحاولة</button>
          )}
        </div>
      )}

      {!loading && !error && !tree?.length && (
        <p className="hierarchy-hint">لا توجد خيارات متاحة حالياً</p>
      )}

      {!loading && !error && rows.map((row) => (
        <select
          key={row.level}
          className="hierarchy-select"
          value={row.selectedId || ""}
          onChange={(e) => handleSelect(row.level, e.target.value)}
          required={row.level === 0}
        >
          <option value="">
            {row.level === 0 ? firstPlaceholder : optionalPlaceholder}
          </option>
          {row.items.map((item) => (
            <option key={item._id} value={item._id}>
              {item.name}
            </option>
          ))}
        </select>
      ))}

      {labels.length > 0 && (
        <p className="hierarchy-path">المسار: {labels.join(" › ")}</p>
      )}
    </div>
  );
}
