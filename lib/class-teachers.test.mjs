// Tests for the helpers behind the teacher lists on the Course Offerings page.
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classLabels, classTime, teacherChanges, teacherChoices, teacherMinutes } from './class-teachers.ts';

const classes = [
  { id: 'a', type: 'LECTURE', assignedProfessorId: 'prof-1', dayOfWeek: 'MONDAY', startTime: '08:30', endTime: '10:00' },
  { id: 'b', type: 'TD', assignedProfessorId: null, dayOfWeek: null, startTime: null, endTime: null },
  { id: 'c', type: 'TD', assignedProfessorId: 'prof-2', dayOfWeek: null, startTime: null, endTime: null },
];

test('names each class, with a number when a kind appears more than once', () => {
  assert.deepEqual(classLabels(classes), ['LECTURE', 'TD 1', 'TD 2']);
  assert.deepEqual(classLabels([]), []);
});

test('says when a class takes place, or nothing while it is not in the timetable', () => {
  assert.equal(classTime(classes[0]), 'Monday 08:30-10:00');
  assert.equal(classTime(classes[1]), null);
});

test('starts the form with the current teacher of each class', () => {
  assert.deepEqual(teacherChoices(classes), { a: 'prof-1', b: '', c: 'prof-2' });
});

test('sends only the classes whose teacher changed', () => {
  assert.deepEqual(teacherChanges(classes, { a: 'prof-1', b: '', c: 'prof-2' }), []);
  assert.deepEqual(teacherChanges(classes, { a: '', b: 'prof-3', c: 'prof-2' }), [
    { classId: 'a', professorId: null },
    { classId: 'b', professorId: 'prof-3' },
  ]);
});

test('leaves out a class that is not in the form', () => {
  assert.deepEqual(teacherChanges(classes, { b: 'prof-3' }), [{ classId: 'b', professorId: 'prof-3' }]);
});

// An offering of a term (from one date to another) with classes of some
// minutes, each with its teacher as saved (null: none).
const offering = (id, startDate, endDate, ...lengths) => ({
  id,
  term: { startDate: `${startDate}T00:00:00.000Z`, endDate: `${endDate}T00:00:00.000Z` },
  classes: lengths.map(([minutes, teacher], at) => ({ id: `${id}-${at}`, durationMinutes: minutes, assignedProfessorId: teacher })),
});

const fall = offering('fall', '2026-09-01', '2027-01-31', [90, 'amal'], [120, null], [90, 'sami']);
const others = [
  fall,
  offering('fall-2', '2026-09-01', '2027-01-31', [180, 'amal'], [60, 'sami']),
  offering('winter', '2027-01-31', '2027-02-20', [120, 'amal']), // starts on the last day of Fall
  offering('spring', '2027-02-15', '2027-06-15', [300, 'amal']), // after Fall: other weeks
];

test('counts the classes of the terms that share a day with the term of the offering', () => {
  const minutes = teacherMinutes(others, fall, teacherChoices(fall.classes));

  // Amal: 90 here, 180 in another Fall offering, 120 in Winter; not Spring.
  assert.equal(minutes.get('amal'), 390);
  assert.equal(minutes.get('sami'), 150);
  assert.equal(minutes.has('nobody'), false);
});

test('counts the classes of the offering as chosen in the form', () => {
  const minutes = teacherMinutes(others, fall, { 'fall-0': 'sami', 'fall-1': 'amal', 'fall-2': '' });

  assert.equal(minutes.get('amal'), 180 + 120 + 120);
  assert.equal(minutes.get('sami'), 60 + 90);
});

test('leaves out one class, to add it to each teacher in its list', () => {
  const choices = teacherChoices(fall.classes);

  assert.equal(teacherMinutes(others, fall, choices, 'fall-0').get('amal'), 300);
  assert.equal(teacherMinutes(others, fall, choices, 'fall-2').get('sami'), 60);
});
