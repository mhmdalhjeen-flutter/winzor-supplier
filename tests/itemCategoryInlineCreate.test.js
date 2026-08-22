import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const selectSrc = fs.readFileSync(path.join(root, 'src/components/ItemCategorySelect.jsx'), 'utf8');
const addFormSrc = fs.readFileSync(path.join(root, 'src/pages/storeOwner/AddProductsOffers.jsx'), 'utf8');

test('ItemCategorySelect puts + إضافة نوع as last dropdown option', () => {
  assert.match(selectSrc, /CREATE_OPTION_VALUE/);
  assert.match(selectSrc, /<option value=\{CREATE_OPTION_VALUE\}>\+ إضافة نوع<\/option>/);
  assert.match(selectSrc, /createItemCategory/);
  assert.match(selectSrc, /onChange\(category\._id\)/);
  assert.match(selectSrc, /اكتب نوع العنصر/);
  assert.match(selectSrc, /'أضف'/);
  assert.doesNotMatch(selectSrc, /item-category-select__add/);
});

test('Add Product and Add Offer both mount ItemCategorySelect', () => {
  const matches = addFormSrc.match(/<ItemCategorySelect/g) || [];
  assert.equal(matches.length, 2);
});
