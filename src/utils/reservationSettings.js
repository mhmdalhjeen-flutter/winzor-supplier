export const RESERVATION_FIELD_TYPES = [
  { value: "text", label: "نص" },
  { value: "phone", label: "هاتف" },
  { value: "number", label: "رقم" },
  { value: "date", label: "تاريخ" },
  { value: "time", label: "وقت" },
  { value: "textarea", label: "نص طويل" },
];

export const EMPTY_RESERVATION_SETTINGS = {
  enabled: false,
  fields: [],
};

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
    order,
  };
}

export function normalizeReservationSettings(raw) {
  const fields = Array.isArray(raw?.fields)
    ? raw.fields.map((field, index) => ({
        id: field.id || createReservationFieldId(),
        label: field.label || field.name || "",
        type: field.type === "long_text" ? "textarea" : (field.type || "text"),
        required: !!field.required,
        order: Number.isInteger(field.order) ? field.order : index,
      }))
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
      .filter((field) => String(field.label || "").trim())
      .map((field, index) => ({
        id: field.id || createReservationFieldId(),
        label: String(field.label).trim(),
        type: field.type || "text",
        required: !!field.required,
        order: index,
      })),
  };
}
