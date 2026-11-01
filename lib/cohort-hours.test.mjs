// Tests for lib/cohort-hours.ts: the weekly hours of each cohort on the Cohorts page.
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cohortHours, cohortHoursText, notPlacedText } from './cohort-hours.ts';

// A class of durationMinutes, in the timetable or not yet.
const cls = (durationMinutes, placed = true) => ({ startTime: placed ? '08:30' : null, durationMinutes });

test('adds up the classes of the term per cohort, in the timetable and not yet', () => {
  const offerings = [
    { termId: 'fall', cohortId: 'se1', classes: [cls(90), cls(120), cls(120, false)] },
    { termId: 'fall', cohortId: 'se1', classes: [cls(180)] },
    { termId: 'fall', cohortId: 'se2', classes: [cls(60, false)] },
    { termId: 'spring', cohortId: 'se1', classes: [cls(300)] },
    { termId: 'fall', cohortId: 'cs1' },
  ];
  assert.deepEqual(cohortHours(offerings, 'fall', 'Fall 2026'), {
    termName: 'Fall 2026',
    placed: { se1: 390 },
    unplaced: { se1: 120, se2: 60 },
  });
  assert.deepEqual(cohortHours(offerings, 'spring', 'Spring 2027').placed, { se1: 300 });
  assert.deepEqual(cohortHours([], 'fall', 'Fall 2026'), { termName: 'Fall 2026', placed: {}, unplaced: {} });
});

test('writes the hours a week of a cohort, and what is not placed yet', () => {
  assert.equal(cohortHoursText(390, 120), '6.5 hrs a week');
  assert.equal(cohortHoursText(60, 0), '1 hr a week');
  assert.equal(cohortHoursText(100, 0), '1.67 hrs a week');
  assert.equal(cohortHoursText(0, 60), '0 hrs a week', 'classes, none of them placed yet');
  assert.equal(cohortHoursText(0, 0), 'No classes');
  assert.equal(notPlacedText(120), '2 hrs not placed yet');
  assert.equal(notPlacedText(60), '1 hr not placed yet');
  assert.equal(notPlacedText(0), null);
});
