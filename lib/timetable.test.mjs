// Tests for the timetable helpers. Run them with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countClassesForCohort, defaultTermId, localDay, roomLabel, teacherLabel, termLabel } from './timetable.ts';

const classes = [
  { cohortName: 'SE - Year 1', dayOfWeek: 'MONDAY' },
  { cohortName: 'SE - Year 1', dayOfWeek: 'WEDNESDAY' },
  { cohortName: 'SE - Year 1', dayOfWeek: 'FRIDAY' },
  { cohortName: 'CS - Year 2', dayOfWeek: 'MONDAY' },
];

test('counts every class block when all cohorts are shown', () => {
  assert.equal(countClassesForCohort(classes, 'All'), 4);
});

test('counts the blocks of one cohort on every day, not only on Monday', () => {
  assert.equal(countClassesForCohort(classes, 'SE - Year 1'), 3);
  assert.equal(countClassesForCohort(classes, 'CS - Year 2'), 1);
});

test('names the room of a class with its building and floor', () => {
  const room = { name: 'Lab 304', floor: { level: '3', building: { name: 'Science Hub', code: 'SCI' } } };
  assert.equal(roomLabel(room), 'Lab 304, Science Hub (SCI) - Level 3');
});

test('names the teacher of a class', () => {
  const teachers = [{ id: 'p1', name: 'Amal Ben Ali' }, { id: 'p2', name: 'Karim Haddad' }];
  assert.equal(teacherLabel('p2', teachers), 'Karim Haddad');
  assert.equal(teacherLabel('gone', teachers), 'Teacher not found');
});

test('says so when a class has no teacher yet', () => {
  assert.equal(teacherLabel(null, []), 'No teacher yet');
  assert.equal(teacherLabel(undefined, []), 'No teacher yet');
});

const terms = [
  { id: 'fall-2025', startDate: '2025-09-01T00:00:00.000Z', endDate: '2026-01-31T00:00:00.000Z' },
  { id: 'spring-2026', startDate: '2026-02-01T00:00:00.000Z', endDate: '2026-06-30T00:00:00.000Z' },
  { id: 'fall-2026', startDate: '2026-09-01T00:00:00.000Z', endDate: '2027-01-31T00:00:00.000Z' },
];

test('starts with the term that is going on today, its last day included', () => {
  assert.equal(defaultTermId(terms, '2026-03-15'), 'spring-2026');
  assert.equal(defaultTermId(terms, '2026-06-30'), 'spring-2026');
});

test('starts with the next term between two terms, else with the latest one', () => {
  assert.equal(defaultTermId(terms, '2026-08-01'), 'fall-2026');
  assert.equal(defaultTermId(terms, '2028-01-01'), 'fall-2026');
  assert.equal(defaultTermId([], '2026-08-01'), '');
});

test('names a term with its kind, and writes a day as YYYY-MM-DD', () => {
  assert.equal(termLabel({ name: 'Fall 2026', type: 'SEMESTER_1' }), 'Fall 2026 (Semester 1)');
  assert.equal(termLabel({ name: 'June', type: 'SUMMER' }), 'June (Summer)');
  assert.equal(localDay(new Date(2026, 10, 1)), '2026-11-01');
});

test('says so when a class has no room', () => {
  assert.equal(roomLabel(null), 'Room not found');
  assert.equal(roomLabel(undefined), 'Room not found');
});

test('counts zero for a cohort without classes', () => {
  assert.equal(countClassesForCohort(classes, 'Unknown group'), 0);
  assert.equal(countClassesForCohort([], 'All'), 0);
});
