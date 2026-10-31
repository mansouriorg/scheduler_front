// Tests for the floor choices on the Classrooms page. Run them with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFloorOptions, findFloorLabel } from './floor-options.ts';

const buildings = [
  { id: 'b1', name: 'Science Hub', code: 'SCI' },
  { id: 'b2', name: 'Arts Center', code: 'ART' },
];
const floors = [
  { id: 'f1', level: '10', buildingId: 'b1' },
  { id: 'f2', level: '2', buildingId: 'b1' },
  { id: 'f3', level: 'Ground', buildingId: 'b2' },
];

test('names each floor after its building and level', () => {
  const options = buildFloorOptions(floors, buildings);
  assert.deepEqual(
    options.map((option) => option.label),
    ['Arts Center (ART) - Level Ground', 'Science Hub (SCI) - Level 2', 'Science Hub (SCI) - Level 10'],
  );
  assert.equal(options[1].id, 'f2');
});

test('still lists a floor whose building is missing', () => {
  const options = buildFloorOptions([{ id: 'f9', level: '1', buildingId: 'gone' }], buildings);
  assert.deepEqual(options, [{ id: 'f9', label: 'Unknown building - Level 1' }]);
});

test('finds the label of a room floor, or says it is unknown', () => {
  const options = buildFloorOptions(floors, buildings);
  assert.equal(findFloorLabel(options, 'f3'), 'Arts Center (ART) - Level Ground');
  assert.equal(findFloorLabel(options, 'nope'), 'Unknown floor');
});
