import { useState } from 'react';

function normalizeTag(raw) {
  return String(raw || '')
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, '');
}

/**
 * Hashtag-style tags input (frontend UX only).
 */
export default function TagsInput({
  label = 'الوسوم',
  value = [],
  onChange,
  placeholder = 'مثال: ملابس ثم Enter',
  examples = ['ملابس', 'جديد', 'خصم'],
}) {
  const [draft, setDraft] = useState('');

  const addTag = (raw) => {
    const tag = normalizeTag(raw);
    if (!tag) return;
    if (value.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange?.([...value, tag]);
    setDraft('');
  };

  const removeTag = (tag) => {
    onChange?.(value.filter((t) => t !== tag));
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="tags-input">
      <label className="field-label">{label}</label>
      <p className="field-hint">تساعد في البحث الداخلي واكتشاف المنتجات</p>

      <div className="tags-input__box">
        {value.map((tag) => (
          <span key={tag} className="tag-chip">
            #{tag}
            <button type="button" aria-label={`حذف ${tag}`} onClick={() => removeTag(tag)}>×</button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => addTag(draft)}
          placeholder={value.length ? '' : placeholder}
        />
      </div>

      {examples?.length > 0 && (
        <div className="tags-examples">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              className="tag-example"
              onClick={() => addTag(ex)}
              disabled={value.some((t) => t.toLowerCase() === ex.toLowerCase())}
            >
              #{ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
