// Tests for the timetable helpers. Run them with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countClassesForCohort, roomLabel, teacherLabel } from './timetable.ts';

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

test('says so when a class has no room', () => {
  assert.equal(roomLabel(null), 'Room not found');
  assert.equal(roomLabel(undefined), 'Room not found');
});

test('counts zero for a cohort without classes', () => {
  assert.equal(countClassesForCohort(classes, 'Unknown group'), 0);
  assert.equal(countClassesForCohort([], 'All'), 0);
});
