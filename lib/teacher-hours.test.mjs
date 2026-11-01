// Tests for lib/teacher-hours.ts: the hours a week teachers already teach, on the
// Teachers page. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hoursOf,
  hoursOfMaximum,
  maximumHint,
  overMaximumText,
  teacherOptionText,
  weeklyHoursLines,
  withClassLine,
} from './teacher-hours.ts';

const week = (termName, minutesPerWeek) => ({ termId: `id-${termName}`, termName, minutesPerWeek });

test('writes the hours of a number of minutes as brain_server does', () => {
  assert.equal(hoursOf(60), '1');
  assert.equal(hoursOf(540), '9');
  assert.equal(hoursOf(810), '13.5');
  assert.equal(hoursOf(100), '1.67');
});

test('shows one line per term, with the maximum', () => {
  const lines = weeklyHoursLines([week('Fall 2026', 540), week('Spring 2027', 270)], 12);

  assert.deepEqual(lines, [
    { key: 'id-Fall 2026', term: 'Fall 2026', hours: '9 of 12 hrs', over: false },
    { key: 'id-Spring 2027', term: 'Spring 2027', hours: '4.5 of 12 hrs', over: false },
  ]);
  assert.deepEqual(weeklyHoursLines([], 12), []);
});

test('marks a term in which the teacher teaches more than the maximum', () => {
  const [exactly, over] = weeklyHoursLines([week('Fall 2026', 720), week('Winter School', 750)], 12);

  assert.equal(exactly.over, false);
  assert.equal(over.over, true);
  assert.equal(over.hours, '12.5 of 12 hrs');
  assert.equal(weeklyHoursLines([week('Fall 2026', 60)], 1)[0].hours, '1 of 1 hr');
});

test('tells, while a teacher is changed, the lowest maximum that is accepted', () => {
  const weeks = [week('Fall 2026', 540), week('Spring 2027', 630), week('Summer 2027', 630)];

  assert.equal(
    maximumHint('Dr. Amal Ben Salah', weeks),
    'Dr. Amal Ben Salah already teaches 10.5 hours a week in Spring 2027, so the maximum cannot be lower than 10.5.',
  );
  assert.equal(
    maximumHint('Dr. Sami Trabelsi', [week('Fall 2026', 60)]),
    'Dr. Sami Trabelsi already teaches 1 hour a week in Fall 2026, so the maximum cannot be lower than 1.',
  );
  assert.equal(maximumHint('Dr. Sami Trabelsi', []), null);
  assert.equal(maximumHint('Dr. Sami Trabelsi', undefined), null);
});

const amal = { name: 'Dr. Amal Ben Salah', department: 'Computer Science', maxHoursPerWeek: 12 };

test('writes the hours of a teacher with their maximum', () => {
  assert.equal(hoursOfMaximum(540, 12), '9 of 12 hrs');
  assert.equal(hoursOfMaximum(90, 1), '1.5 of 1 hr');
});

test('names a teacher in the list of a class, with the hours they would teach', () => {
  assert.equal(teacherOptionText(amal, 630), 'Dr. Amal Ben Salah: 10.5 of 12 hrs (Computer Science)');
  assert.equal(teacherOptionText(amal, 720), 'Dr. Amal Ben Salah: 12 of 12 hrs (Computer Science)');
  assert.equal(
    teacherOptionText(amal, 810),
    'Dr. Amal Ben Salah: 13.5 of 12 hrs, over the maximum (Computer Science)',
  );
});

test('writes the line under a list for the teacher chosen', () => {
  assert.deepEqual(withClassLine(690, 12), { text: 'With this class: 11.5 of 12 hrs a week', over: false });
  assert.deepEqual(withClassLine(720, 12), { text: 'With this class: 12 of 12 hrs a week', over: false });
  assert.deepEqual(withClassLine(870, 12), { text: 'With this class: 14.5 of 12 hrs a week, over the maximum', over: true });
});

test('says when the chosen teacher would teach more than their maximum', () => {
  assert.equal(overMaximumText(amal, 720, 'Fall 2026'), null);
  assert.equal(
    overMaximumText(amal, 810, 'Fall 2026'),
    'Dr. Amal Ben Salah would teach 13.5 hours a week in Fall 2026, more than their maximum of 12 hours.',
  );
  assert.equal(
    overMaximumText({ ...amal, maxHoursPerWeek: 1 }, 90, 'Fall 2026'),
    'Dr. Amal Ben Salah would teach 1.5 hours a week in Fall 2026, more than their maximum of 1 hour.',
  );
});
