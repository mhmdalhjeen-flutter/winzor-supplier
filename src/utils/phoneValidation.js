/** رقم محلي فلسطيني: 059 (جوال) أو 056 (وطنية) + 7 أرقام = 10 */
const LOCAL_PHONE_REGEX = /^05(9|6)\d{7}$/;
const WHATSAPP_REGEX = /^\+97[02]5[69]\d{7}$/;

export const LOCAL_PHONE_PLACEHOLDER = '0592222222';
export const WHATSAPP_PLACEHOLDER = '+970592222222';

export const LOCAL_PHONE_MESSAGE =
  'رقم فلسطيني فقط: 059 (جوال) أو 056 (وطنية) ثم 7 أرقام — 10 أرقام بالمجموع';

export const WHATSAPP_MESSAGE =
  'واتساب: +9705 أو +9725 ثم 6 أو 9 و7 أرقام — مثل +970592222222 أو +972562222222';

const strip = (value) => String(value || '').trim().replace(/[\s\-()]/g, '');

export function normalizeLocalPhone(value) {
  let p = strip(value);
  if (!p) return '';
  if (p.startsWith('+')) {
    if (/^\+9705[69]\d{7}$/.test(p)) return `0${p.slice(4)}`;
    if (/^\+9725[69]\d{7}$/.test(p)) return `0${p.slice(4)}`;
    return p;
  }
  if (/^009705[69]\d{7}$/.test(p)) return `0${p.slice(5)}`;
  if (/^009725[69]\d{7}$/.test(p)) return `0${p.slice(5)}`;
  if (/^9705[69]\d{7}$/.test(p)) return `0${p.slice(3)}`;
  if (/^9725[69]\d{7}$/.test(p)) return `0${p.slice(3)}`;
  if (/^5[69]\d{7}$/.test(p)) return `0${p}`;
  return p;
}

export function isValidLocalPhone(value) {
  return LOCAL_PHONE_REGEX.test(normalizeLocalPhone(value));
}

export function getPhoneCarrier(value) {
  const p = normalizeLocalPhone(value);
  if (p.startsWith('059')) return 'jawwal';
  if (p.startsWith('056')) return 'wataniya';
  if (p.length >= 3) {
    if (p[2] === '9') return 'jawwal';
    if (p[2] === '6') return 'wataniya';
  }
  return null;
}

export function sanitizeLocalPhoneInput(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('009705') || digits.startsWith('009725')) digits = `0${digits.slice(5)}`;
  else if (digits.startsWith('9705') || digits.startsWith('9725')) digits = `0${digits.slice(3)}`;
  if (digits[0] !== '0') return '';
  if (digits.length >= 2 && digits[1] !== '5') return '0';
  if (digits.length >= 3 && digits[2] !== '6' && digits[2] !== '9') return digits.slice(0, 2);
  return digits.slice(0, 10);
}

export function getPhoneInputStyle(carrier) {
  if (carrier === 'jawwal') {
    return { borderColor: '#22c55e', color: '#15803d', background: '#f0fdf4' };
  }
  if (carrier === 'wataniya') {
    return { borderColor: '#ef4444', color: '#b91c1c', background: '#fef2f2' };
  }
  return {};
}

export function normalizeWhatsApp(value, { defaultCountry = '970' } = {}) {
  let p = strip(value);
  if (!p) return '';
  if (/^05[69]\d{7}$/.test(p)) return `+${defaultCountry}${p.slice(1)}`;
  if (/^5[69]\d{7}$/.test(p)) return `+${defaultCountry}5${p.slice(1)}`;
  if (/^009705[69]\d{7}$/.test(p)) return `+9705${p.slice(6)}`;
  if (/^009725[69]\d{7}$/.test(p)) return `+9725${p.slice(6)}`;
  if (/^9705[69]\d{7}$/.test(p)) return `+${p}`;
  if (/^9725[69]\d{7}$/.test(p)) return `+${p}`;
  if (!p.startsWith('+')) p = `+${p}`;
  if (/^\+9705[69]\d{7}$/.test(p) || /^\+9725[69]\d{7}$/.test(p)) return p;
  return p;
}

export function isValidWhatsApp(value) {
  return WHATSAPP_REGEX.test(normalizeWhatsApp(value));
}

export const normalizePhone = normalizeLocalPhone;
export const isValidPhone = isValidLocalPhone;

export function getLocalPhoneError(value) {
  if (!strip(value)) return 'أدخل رقم الهاتف';
  if (!isValidLocalPhone(value)) return LOCAL_PHONE_MESSAGE;
  return null;
}

export function getWhatsAppError(value) {
  if (!strip(value)) return 'أدخل رقم الواتساب';
  if (!isValidWhatsApp(value)) return WHATSAPP_MESSAGE;
  return null;
}
