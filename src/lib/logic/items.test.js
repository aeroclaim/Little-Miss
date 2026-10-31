import assert from 'node:assert/strict';
import test from 'node:test';
import { combineItemLists } from './items.js';

test('combined delivery aggregates matching serials from packages and manual items', () => {
  assert.deepEqual(combineItemLists(
    [{ serial_number: 4, quantity: 3 }, { serial_number: 8, quantity: 2 }],
    [{ serial_number: 4, quantity: 5 }, { serial_number: 2, quantity: 1 }]
  ), [
    { serial_number: 2, quantity: 1 },
    { serial_number: 4, quantity: 8 },
    { serial_number: 8, quantity: 2 },
  ]);
});
