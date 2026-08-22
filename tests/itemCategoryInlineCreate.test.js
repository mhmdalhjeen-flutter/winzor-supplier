import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const selectSrc = fs.readFileSync(path.join(root, 'src/components/ItemCategorySelect.jsx'), 'utf8');
const addFormSrc = fs.readFileSync(path.join(root, 'src/pages/storeOwner/AddProductsOffers.jsx'), 'utf8');

test('ItemCategorySelect exposes inline add-type UI and API create', () => {
  assert.match(selectSrc, /\+ إضافة نوع/);
  assert.match(selectSrc, /اسم النوع/);
  assert.match(selectSrc, /أضف/);
  assert.match(selectSrc, /createItemCategory/);
  assert.match(selectSrc, /onChange\(category\._id\)/);
  assert.doesNotMatch(selectSrc, /<form[\s\S]*item-category-select__create/);
});

test('Add Product and Add Offer both mount ItemCategorySelect', () => {
  const matches = addFormSrc.match(/<ItemCategorySelect/g) || [];
  assert.equal(matches.length, 2);
});
