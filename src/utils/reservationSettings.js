export const RESERVATION_FIELD_TYPES = [
  { value: "text", label: "نص" },
  { value: "phone", label: "هاتف" },
  { value: "number", label: "رقم" },
  { value: "date", label: "تاريخ" },
  { value: "time", label: "وقت" },
  { value: "textarea", label: "نص طويل" },
  { value: "note", label: "ملاحظة" },
];

export const EMPTY_RESERVATION_SETTINGS = {
  enabled: false,
  fields: [],
};

export const NOTE_FIELD_LABEL = "ملاحظة";

export function isReservationNoteField(field) {
  return String(field?.type || "") === "note";
}

export function createReservationFieldId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `field-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyReservationField(order = 0) {
  return {
    id: createReservationFieldId(),
    label: "",
    type: "text",
    required: true,
    content: "",
    order,
  };
}

function normalizeFieldType(type) {
  if (type === "long_text") return "textarea";
  if (type === "ملاحظة") return "note";
  return type || "text";
}

export function normalizeReservationSettings(raw) {
  const fields = Array.isArray(raw?.fields)
    ? raw.fields.map((field, index) => {
        const type = normalizeFieldType(field.type);
        const isNote = type === "note";
        const label = field.label || field.name || "";
        return {
          id: field.id || createReservationFieldId(),
          label: isNote ? (label || NOTE_FIELD_LABEL) : label,
          type,
          required: isNote ? false : !!field.required,
          content: isNote ? String(field.content || "").trim() : "",
          order: Number.isInteger(field.order) ? field.order : index,
        };
      })
    : [];
  return {
    enabled: !!raw?.enabled,
    fields,
  };
}

export function toReservationSettingsPayload(settings) {
  const normalized = normalizeReservationSettings(settings);
  return {
    enabled: !!normalized.enabled,
    fields: (normalized.fields || [])
      .filter((field) => (
        isReservationNoteField(field)
          ? String(field.content || "").trim()
          : String(field.label || "").trim()
      ))
      .map((field, index) => {
        const payload = {
          id: field.id || createReservationFieldId(),
          label: isReservationNoteField(field)
            ? NOTE_FIELD_LABEL
            : String(field.label || "").trim(),
          type: field.type || "text",
          required: isReservationNoteField(field) ? false : !!field.required,
          order: index,
        };
        if (isReservationNoteField(field)) {
          payload.label = NOTE_FIELD_LABEL;
          payload.content = String(field.content || "").trim();
        }
        return payload;
      }),
  };
}
