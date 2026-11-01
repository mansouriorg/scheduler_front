// Tests for lib/table-search.ts: the search box above the tables. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterBySearch, matchesSearch, noMatchText, searchCount, searchLocations, searchText, searchWords } from './table-search.ts';

// The letters e and E with an acute accent.
const E_ACUTE = String.fromCharCode(0xe9);
const E_ACUTE_CAPITAL = String.fromCharCode(0xc9);

const teachers = [
  { name: 'Dr. Amal Ben Salah', department: 'Informatique' },
  { name: 'Dr. Sami Trabelsi', department: `Math${E_ACUTE}matiques` },
  { name: `Dr. H${E_ACUTE}di Ben Ali`, department: 'Informatique' },
];
const search = (query) => filterBySearch(teachers, query, (t) => [t.name, t.department]).map((t) => t.name);

test('compares without capitals, accents or extra spaces', () => {
  assert.equal(searchText(`  Dr.  H${E_ACUTE_CAPITAL}DI\tBen Ali `), 'dr. hedi ben ali');
  assert.equal(searchText(`Math${E_ACUTE}matiques`), 'mathematiques');
  assert.deepEqual(searchWords('  amal   INFO '), ['amal', 'info']);
  assert.deepEqual(searchWords('   '), []);
});

test('shows every row while nothing is typed', () => {
  assert.deepEqual(search(''), ['Dr. Amal Ben Salah', 'Dr. Sami Trabelsi', `Dr. H${E_ACUTE}di Ben Ali`]);
  assert.deepEqual(search('   '), search(''));
});

test('keeps the rows that have every word, in any order and in any column', () => {
  assert.deepEqual(search('ben'), ['Dr. Amal Ben Salah', `Dr. H${E_ACUTE}di Ben Ali`]);
  assert.deepEqual(search('info ben ali'), [`Dr. H${E_ACUTE}di Ben Ali`]);
  assert.deepEqual(search('hedi'), [`Dr. H${E_ACUTE}di Ben Ali`], 'an accent typed or not makes no difference');
  assert.deepEqual(search(`MATH${E_ACUTE_CAPITAL}`), ['Dr. Sami Trabelsi']);
  assert.deepEqual(search('sami info'), [], 'Sami does not teach in Informatique');
  assert.deepEqual(search('physics'), []);
});

test('finds what is typed in one value, also while a word is not finished', () => {
  assert.equal(matchesSearch(['Lab 304', 'Computer Lab'], 'lab 3'), true);
  assert.equal(matchesSearch(['DEV-101', 'Intro to Programming'], 'dev-1'), true);
  assert.equal(matchesSearch(['DEV-101', 'Intro to Programming'], 'to prog'), true);
  assert.equal(matchesSearch(['DEV-101', 'Intro to Programming'], 'intro dev'), true, 'or every word, in any order');
  assert.equal(matchesSearch(['Lab 304'], ''), true);
});

test('a number among the words is a whole number of the row', () => {
  // An offering: course, title, cohort, term, teacher.
  const year1 = ['NET-110', 'Networks', 'SE - Year 1', 'Fall 2026', 'Dr. Sami Trabelsi'];
  const year2 = ['DB-201', 'Databases', 'SE - Year 2', 'Fall 2026', 'Dr. Sami Trabelsi'];
  assert.equal(matchesSearch(year2, 'year 2'), true);
  assert.equal(matchesSearch(year1, 'year 2'), false, '2 is not 2026');
  assert.equal(matchesSearch(year1, 'se - year 2'), false);
  assert.equal(matchesSearch(year2, 'fall year 2'), true);
  assert.equal(matchesSearch(year1, 'fall year 2'), false);
  assert.equal(matchesSearch(year1, 'sami 2026'), true);
  assert.equal(matchesSearch(year1, 'sami 20'), false);
  assert.equal(matchesSearch(['Room B12'], 'room 12'), true, 'a number inside a name counts');
});

test('finds nothing across two values', () => {
  assert.equal(matchesSearch(['Lab', '304'], 'lab 304'), true, 'every word is there');
  assert.equal(matchesSearch(['Year', '2026'], 'year 2'), false);
  assert.equal(matchesSearch(['Amphi A', 'Building'], 'ab'), false);
});

test('leaves out empty values and finds numbers', () => {
  const rooms = [{ name: 'Lab 304', floor: null, capacity: 30 }, { name: 'Amphi A', floor: undefined, capacity: 120 }];
  assert.deepEqual(filterBySearch(rooms, '120', (r) => [r.name, r.floor, r.capacity]).map((r) => r.name), ['Amphi A']);
  assert.deepEqual(filterBySearch(rooms, 'null', (r) => [r.name, r.floor, r.capacity]), []);
});

test('says how many rows the search shows, and when none matches', () => {
  assert.equal(searchCount(2, 12, 'ben', 'teacher', 'teachers'), '2 of 12 teachers');
  assert.equal(searchCount(0, 1, 'x', 'teacher', 'teachers'), '0 of 1 teacher');
  assert.equal(searchCount(12, 12, '  ', 'teacher', 'teachers'), null);
  assert.equal(noMatchText('  physics ', 'teacher'), 'No teacher matches "physics".');
});

// The Locations page: three campuses (one without buildings), three buildings and floors.
const campuses = [{ id: 'main', name: 'Main Campus' }, { id: 'north', name: 'North Campus' }, { id: 'sports', name: 'Sports Campus' }];
const buildings = [
  { id: 'sci', name: 'Science Building', code: 'SCI', campusId: 'main' },
  { id: 'lib', name: 'Library', code: 'LIB', campusId: 'main' },
  { id: 'eng', name: 'Engineering Hall', code: 'ENG', campusId: 'north' },
];
const floors = [
  { buildingId: 'sci', level: '1' },
  { buildingId: 'sci', level: '2' },
  { buildingId: 'eng', level: 'Ground' },
];
const places = (query) => {
  const found = searchLocations(campuses, buildings, floors, query);
  return [found.campuses.map((c) => c.name), found.buildings.map((b) => b.code)];
};

test('locations: shows every campus and building while nothing is typed', () => {
  assert.deepEqual(places(''), [['Main Campus', 'North Campus', 'Sports Campus'], ['SCI', 'LIB', 'ENG']]);
});

test('locations: a building found by its name, code or floor shows with its campus', () => {
  assert.deepEqual(places('library'), [['Main Campus'], ['LIB']]);
  assert.deepEqual(places('eng'), [['North Campus'], ['ENG']]);
  assert.deepEqual(places('level 2'), [['Main Campus'], ['SCI']]);
  assert.deepEqual(places('ground'), [['North Campus'], ['ENG']]);
  assert.deepEqual(places('main sci'), [['Main Campus'], ['SCI']], 'campus and building words together');
});

test('locations: a campus found by its name shows all its buildings, or none when it has none', () => {
  assert.deepEqual(places('main campus'), [['Main Campus'], ['SCI', 'LIB']]);
  assert.deepEqual(places('sports'), [['Sports Campus'], []]);
  assert.deepEqual(places('campus'), [['Main Campus', 'North Campus', 'Sports Campus'], ['SCI', 'LIB', 'ENG']]);
  assert.deepEqual(places('stadium'), [[], []]);
});
