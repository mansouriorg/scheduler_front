// Tests for the helpers behind the teacher lists on the Course Offerings page.
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classLabels, classTime, teacherChanges, teacherChoices } from './class-teachers.ts';

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
