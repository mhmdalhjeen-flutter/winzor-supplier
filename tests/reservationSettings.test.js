/**
 * Reservation settings payload helpers — run with:
 * node --import ./tests/register.mjs --test tests/reservationSettings.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isReservationNoteField,
  normalizeReservationSettings,
  toReservationSettingsPayload,
} from '../src/utils/reservationSettings.js';

test('existing fields without notes still serialize', () => {
  const payload = toReservationSettingsPayload({
    enabled: true,
    fields: [
      { id: 'name', label: 'الاسم', type: 'text', required: true, order: 0 },
      { id: 'phone', label: 'هاتف', type: 'phone', required: false, order: 1 },
    ],
  });
  assert.equal(payload.fields.length, 2);
  assert.equal(payload.fields[0].type, 'text');
  assert.equal(payload.fields[1].required, false);
  assert.equal(payload.fields[0].content, undefined);
});

test('notes keep order among input fields and are never required', () => {
  const payload = toReservationSettingsPayload({
    enabled: true,
    fields: [
      { id: 'n0', type: 'note', content: 'قبل', order: 0 },
      { id: 'name', label: 'الاسم', type: 'text', required: true, order: 1 },
      { id: 'n1', type: 'note', content: 'بين', required: true, order: 2 },
      { id: 'phone', label: 'هاتف', type: 'phone', required: true, order: 3 },
      { id: 'n2', type: 'note', content: 'بعد', order: 4 },
    ],
  });
  assert.deepEqual(payload.fields.map((field) => field.type), ['note', 'text', 'note', 'phone', 'note']);
  assert.deepEqual(payload.fields.map((field) => field.content).filter(Boolean), ['قبل', 'بين', 'بعد']);
  assert.equal(payload.fields.filter(isReservationNoteField).every((field) => field.required === false), true);
  assert.equal(payload.fields[0].label, 'ملاحظة');
});

test('empty notes are dropped while empty labels drop only input fields', () => {
  const payload = toReservationSettingsPayload({
    enabled: true,
    fields: [
      { id: 'n0', type: 'note', content: '   ', order: 0 },
      { id: 'blank', label: '  ', type: 'text', order: 1 },
      { id: 'ok', label: 'الاسم', type: 'text', order: 2 },
      { id: 'n1', type: 'note', content: 'باقٍ', order: 3 },
    ],
  });
  assert.deepEqual(payload.fields.map((field) => field.id), ['ok', 'n1']);
});

test('reordering notes with fields is preserved by order index', () => {
  const normalized = normalizeReservationSettings({
    enabled: true,
    fields: [
      { id: 'phone', label: 'هاتف', type: 'phone', order: 2 },
      { id: 'n1', type: 'note', content: 'وسط', order: 1 },
      { id: 'name', label: 'الاسم', type: 'text', order: 0 },
    ],
  });
  const payload = toReservationSettingsPayload({
    ...normalized,
    fields: [normalized.fields[2], normalized.fields[1], normalized.fields[0]],
  });
  assert.deepEqual(payload.fields.map((field) => field.id), ['name', 'n1', 'phone']);
  assert.deepEqual(payload.fields.map((field) => field.order), [0, 1, 2]);
});
