import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CARD_QTY_STEP,
  parseCardQuantity,
  stepCardQuantity,
  cardQuantityInputValue,
} from '../src/utils/cardQuantity.js';

test('card quantity step stays at 5', () => {
  assert.equal(CARD_QTY_STEP, 5);
  assert.equal(stepCardQuantity(0, 1), 5);
  assert.equal(stepCardQuantity(5, 1), 10);
  assert.equal(stepCardQuantity(15, 1), 20);
  assert.equal(stepCardQuantity(5, -1), 0);
  assert.equal(stepCardQuantity(0, -1), 0);
});

test('focused empty display does not change the stored zero', () => {
  assert.equal(cardQuantityInputValue(0, false), '0');
  assert.equal(cardQuantityInputValue(0, true), '');
  assert.equal(cardQuantityInputValue(5, true), '5');
  assert.equal(parseCardQuantity(''), 0);
  assert.equal(parseCardQuantity('15'), 15);
});
