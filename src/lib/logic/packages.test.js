import assert from 'node:assert/strict';
import test from 'node:test';
import { generatePackageContents, packageBreakdownGroups, townAssignments } from './packages.js';

const catalog = [
  { serial: 1, product: {} },
  { serial: 2, product: {} },
  { serial: 3, product: {} },
];

test('town assignments are resolved independent of letter case and surrounding spaces', () => {
  assert.deepEqual(townAssignments('  Haifa ', [
    { name: 'haifa', assigned_serials: ['1', 2, 0, 'bad'] },
  ]), [1, 2]);
});

test('package breakdown keeps each quantity grouped with its serial numbers', () => {
  assert.deepEqual(packageBreakdownGroups([
    { serial_number: 9, quantity: 1 },
    { serial_number: 2, quantity: 5 },
    { serial_number: 4, quantity: 1 },
    { serial_number: 3, quantity: 5 },
    { serial_number: 8, quantity: 0 },
  ]), [
    { quantity: 5, serials: [2, 3] },
    { quantity: 1, serials: [4, 9] },
  ]);
});

test('assigned variations with enough printed stock can be packaged', () => {
  const [pkg] = generatePackageContents({
    packages: [{ id: 'p1', package_number: 1, town: 'Haifa', assigned_serials: townAssignments('Haifa', [{ name: 'haifa', assigned_serials: [1, 2] }]) }],
    recipes: [{ group: 'assigned', number_count: 2, copies_each: 4 }],
    catalog,
    stock: {
      1: { physicalAvailable: 10, available: 10 },
      2: { physicalAvailable: 10, available: 10 },
    },
    random: () => 0,
  });
  assert.deepEqual(pkg.items, [{ serial_number: 1, quantity: 4 }, { serial_number: 2, quantity: 4 }]);
  assert.equal(pkg.total_units, 8);
});

test('selected ready package reservation is released during its own regeneration', () => {
  const existingPackages = [{ id: 'p1', status: 'ready', items: [{ serial_number: 1, quantity: 8 }] }];
  const [pkg] = generatePackageContents({
    packages: [{ id: 'p1', package_number: 1, town: 'Haifa', assigned_serials: [1] }],
    recipes: [{ group: 'assigned', number_count: 1, copies_each: 10 }],
    catalog: [catalog[0]],
    stock: { 1: { physicalAvailable: 10, available: 2 } },
    existingPackages,
    random: () => 0,
  });
  assert.deepEqual(pkg.items, [{ serial_number: 1, quantity: 10 }]);
});

test('other ready packages remain reserved and cannot be allocated twice', () => {
  const existingPackages = [{ id: 'reserved', status: 'ready', items: [{ serial_number: 1, quantity: 6 }] }];
  assert.throws(() => generatePackageContents({
    packages: [{ id: 'new', package_number: 2, town: 'Haifa', assigned_serials: [1] }],
    recipes: [{ group: 'assigned', number_count: 1, copies_each: 5 }],
    catalog: [catalog[0]],
    stock: { 1: { physicalAvailable: 10, available: 4 } },
    existingPackages,
    random: () => 0,
  }), /only 0 eligible numbers remain/);
});

test('paused numbers are not eligible for package recipes', () => {
  assert.throws(() => generatePackageContents({
    packages: [{ id: 'p1', package_number: 1, town: 'Haifa', assigned_serials: [1] }],
    recipes: [{ group: 'assigned', number_count: 1, copies_each: 1 }],
    catalog: [{ serial: 1, product: { distribution_paused: true } }],
    stock: { 1: { physicalAvailable: 4, available: 4 } },
  }), /only 0 eligible numbers remain/);
});

test('items marked not for sale are excluded from package recipes', () => {
  assert.throws(() => generatePackageContents({
    packages: [{ id: 'p1', package_number: 1, town: 'Haifa', assigned_serials: [1] }],
    recipes: [{ group: 'assigned', number_count: 1, copies_each: 1 }],
    catalog: [{ serial: 1, product: { not_for_sale: true } }],
    stock: { 1: { physicalAvailable: 4, available: 4 } },
  }), /only 0 eligible numbers remain/);
});

test('missing town assignments produce a setup error instead of a stock shortage', () => {
  assert.throws(() => generatePackageContents({
    packages: [{ id: 'p1', package_number: 1, town: 'Haifa', assigned_serials: townAssignments('Haifa', []) }],
    recipes: [{ group: 'assigned', number_count: 1, copies_each: 1 }],
    catalog,
    stock: {},
  }), /No town-assigned numbers are configured for package #1 \(Haifa\)/);
});
