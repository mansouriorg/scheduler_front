// Tests for lib/table-sort.ts: sorting the tables by a column. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ariaSort,
  directionText,
  nextSort,
  sortChoice,
  sortChoices,
  sortFromChoice,
  sortRows,
  sortText,
} from './table-sort.ts';

const rooms = [
  { name: 'Lab 10', capacity: 30, opened: '2025-09-01T00:00:00.000Z' },
  { name: 'amphi A', capacity: 120, opened: '2024-02-15T00:00:00.000Z' },
  { name: 'Lab 2', capacity: null, opened: '2026-01-10T00:00:00.000Z' },
  { name: 'Room B', capacity: 30, opened: '' },
];
const COLUMNS = [
  { key: 'name', label: 'Name', kind: 'text', value: (room) => room.name },
  { key: 'capacity', label: 'Capacity', kind: 'number', value: (room) => room.capacity },
  { key: 'opened', label: 'Opened', kind: 'date', value: (room) => room.opened },
];
const names = (sort) => sortRows(rooms, COLUMNS, sort).map((room) => room.name);

test('keeps the order of brain_server until a column is chosen', () => {
  assert.deepEqual(names(null), ['Lab 10', 'amphi A', 'Lab 2', 'Room B']);
  assert.deepEqual(names({ key: 'unknown', descending: false }), names(null));
  assert.notEqual(sortRows(rooms, COLUMNS, { key: 'name', descending: false }), rooms, 'the list itself is not changed');
});

test('sorts text A to Z without regard to capitals, and numbers in names by their value', () => {
  assert.deepEqual(names({ key: 'name', descending: false }), ['amphi A', 'Lab 2', 'Lab 10', 'Room B']);
  assert.deepEqual(names({ key: 'name', descending: true }), ['Room B', 'Lab 10', 'Lab 2', 'amphi A']);
});

test('sorts numbers and dates, with empty values last both ways and ties in their first order', () => {
  assert.deepEqual(names({ key: 'capacity', descending: false }), ['Lab 10', 'Room B', 'amphi A', 'Lab 2']);
  assert.deepEqual(names({ key: 'capacity', descending: true }), ['amphi A', 'Lab 10', 'Room B', 'Lab 2']);
  assert.deepEqual(names({ key: 'opened', descending: false }), ['amphi A', 'Lab 10', 'Lab 2', 'Room B']);
  assert.deepEqual(names({ key: 'opened', descending: true }), ['Lab 2', 'Lab 10', 'amphi A', 'Room B']);
});

test('the same text with other capitals or accents stays in its first order', () => {
  const E_ACUTE = String.fromCharCode(0xe9);
  const rows = [{ name: 'Lab A' }, { name: 'lab a' }, { name: `Lab ${E_ACUTE}` }, { name: 'Lab E' }];
  const sorted = (descending) => sortRows(rows, COLUMNS.slice(0, 1), { key: 'name', descending }).map((row) => row.name);
  assert.deepEqual(sorted(false), ['Lab A', 'lab a', `Lab ${E_ACUTE}`, 'Lab E']);
  assert.deepEqual(sorted(true), [`Lab ${E_ACUTE}`, 'Lab E', 'Lab A', 'lab a']);
});

test('dates are sorted by their time, not by their text', () => {
  // 10 January 00:00 at UTC+5 is 9 January 19:00 UTC, one hour before the other.
  const rows = [{ opened: '2026-01-09T20:00:00.000Z' }, { opened: '2026-01-10T00:00:00.000+05:00' }];
  const sorted = sortRows(rows, COLUMNS.slice(2), { key: 'opened', descending: false });
  assert.deepEqual(sorted.map((row) => row.opened), ['2026-01-10T00:00:00.000+05:00', '2026-01-09T20:00:00.000Z']);
});

test('a click sorts by the column, a second click reverses it', () => {
  const first = nextSort(null, 'name');
  assert.deepEqual(first, { key: 'name', descending: false });
  const second = nextSort(first, 'name');
  assert.deepEqual(second, { key: 'name', descending: true });
  assert.deepEqual(nextSort(second, 'name'), { key: 'name', descending: false });
  assert.deepEqual(nextSort(second, 'capacity'), { key: 'capacity', descending: false });
});

test('says how the table is sorted, and marks only that heading', () => {
  assert.equal(sortText(COLUMNS, { key: 'capacity', descending: true }), 'Sorted by Capacity, highest first');
  assert.equal(sortText(COLUMNS, { key: 'opened', descending: false }), 'Sorted by Opened, earliest first');
  assert.equal(sortText(COLUMNS, null), null);
  assert.equal(directionText('text', true), 'Z to A');
  assert.equal(ariaSort({ key: 'name', descending: false }, 'name'), 'ascending');
  assert.equal(ariaSort({ key: 'name', descending: true }, 'name'), 'descending');
  assert.equal(ariaSort({ key: 'name', descending: true }, 'capacity'), undefined);
  assert.equal(ariaSort(null, 'name'), undefined);
});

test('the Sort by list has each column both ways, and gives the same order back', () => {
  assert.deepEqual(sortChoices(COLUMNS.slice(0, 2)), [
    { value: 'name:asc', label: 'Name, A to Z' },
    { value: 'name:desc', label: 'Name, Z to A' },
    { value: 'capacity:asc', label: 'Capacity, lowest first' },
    { value: 'capacity:desc', label: 'Capacity, highest first' },
  ]);
  for (const sort of [null, { key: 'name', descending: false }, { key: 'capacity', descending: true }]) {
    assert.deepEqual(sortFromChoice(sortChoice(sort)), sort);
  }
  assert.equal(sortFromChoice(''), null);
});
