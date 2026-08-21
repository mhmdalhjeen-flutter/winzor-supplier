import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Mirrors deriveOptionSwitches in AddProductsOffers.jsx — keep in sync.
 * Selling method switch stays OFF when mode is quantity (default).
 */
function deriveOptionSwitches(data = {}) {
  const mode = String(data.purchaseMode || 'quantity').toLowerCase();
  const reservationEnabled = !!data.reservationSettings?.enabled;
  return {
    variants: !!(data.variantsEnabled || (Array.isArray(data.variants) && data.variants.length > 0)),
    purchaseMode: mode !== 'quantity',
    reservation: reservationEnabled,
    tags: Array.isArray(data.tags) && data.tags.length > 0,
  };
}

test('new item defaults keep all feature switches OFF', () => {
  assert.deepEqual(deriveOptionSwitches({ purchaseMode: 'quantity' }), {
    variants: false,
    purchaseMode: false,
    reservation: false,
    tags: false,
  });
});

test('selling method switch is ON only when not quantity', () => {
  assert.equal(deriveOptionSwitches({ purchaseMode: 'price' }).purchaseMode, true);
  assert.equal(deriveOptionSwitches({ purchaseMode: 'both' }).purchaseMode, true);
  assert.equal(deriveOptionSwitches({ purchaseMode: 'quantity' }).purchaseMode, false);
  assert.equal(deriveOptionSwitches({}).purchaseMode, false);
});

test('variants / reservation / tags switches follow existing data', () => {
  const switches = deriveOptionSwitches({
    purchaseMode: 'quantity',
    variants: [{ name: 'اللون', values: 'أحمر' }],
    reservationSettings: { enabled: true, fields: [] },
    tags: ['جديد'],
  });
  assert.deepEqual(switches, {
    variants: true,
    purchaseMode: false,
    reservation: true,
    tags: true,
  });
});
