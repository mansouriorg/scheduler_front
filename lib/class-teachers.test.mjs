// Tests for the helpers behind the teacher lists on the Course Offerings page.
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classLabels,
  classTime,
  notFreeLine,
  notFreeTeachers,
  notFreeText,
  teacherChanges,
  teacherChoices,
  teacherMinutes,
} from './class-teachers.ts';

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

// A class of 90 minutes: its kind, its teacher as saved (null: none), and its day
// and times in the timetable (null: not in it).
const placed = (id, type, teacher, day, startTime, endTime) => ({
  id,
  type,
  durationMinutes: 90,
  assignedProfessorId: teacher,
  dayOfWeek: day,
  startTime,
  endTime,
});
// An offering of a course for a cohort in a term, from one date to another.
const timed = (id, code, cohort, startDate, endDate, ...lessons) => ({
  id,
  course: { code },
  cohort: { name: cohort },
  term: { startDate: `${startDate}T00:00:00.000Z`, endDate: `${endDate}T00:00:00.000Z` },
  classes: lessons,
});

const dev = timed(
  'dev',
  'DEV-101',
  'SE - Year 1',
  '2026-09-01',
  '2027-01-31',
  placed('dev-lecture', 'LECTURE', null, 'MONDAY', '08:30', '10:00'),
  placed('dev-td', 'TD', null, null, null, null),
);
const timetable = [
  dev,
  timed(
    'db',
    'DB-201',
    'SE - Year 2',
    '2026-09-01',
    '2027-01-31',
    placed('db-td', 'TD', 'sami', 'MONDAY', '09:00', '10:30'),
    placed('db-tp', 'TP', 'karim', 'MONDAY', '10:00', '11:30'), // starts when the lecture ends
  ),
  // Another term, other weeks.
  timed('net', 'NET-110', 'SE - Year 2', '2027-02-15', '2027-06-15', placed('net-td', 'TD', 'lina', 'MONDAY', '08:30', '10:00')),
];
const staff = [
  { id: 'amal', unavailability: [{ dayOfWeek: 'MONDAY', startTime: '08:00', endTime: '09:00' }] },
  { id: 'sami' },
  { id: 'karim', unavailability: [{ dayOfWeek: 'TUESDAY', startTime: '08:00', endTime: '18:30' }] },
  { id: 'lina' },
];
const amalAway = { kind: 'away', dayOfWeek: 'MONDAY', startTime: '08:00', endTime: '09:00' };
const samiTeaching = { kind: 'teaching', label: 'DB-201 TD for SE - Year 2', startTime: '09:00', endTime: '10:30' };

test('finds the teachers who are away or teach another class at the time of a class', () => {
  const reasons = notFreeTeachers(timetable, dev, dev.classes[0], staff);

  // Karim's class starts when the lecture ends, and his time off is on Tuesday;
  // Lina teaches then in another term.
  assert.deepEqual(Object.fromEntries(reasons), { amal: amalAway, sami: samiTeaching });
});

test('names the time off first, and finds nobody for a class that is not in the timetable', () => {
  const sami = { id: 'sami', unavailability: [{ dayOfWeek: 'MONDAY', startTime: '09:30', endTime: '12:00' }] };

  assert.equal(notFreeTeachers(timetable, dev, dev.classes[0], [sami]).get('sami').kind, 'away');
  assert.equal(notFreeTeachers(timetable, dev, dev.classes[1], staff).size, 0);
});

test('says why a teacher is not free, in the words of brain_server', () => {
  assert.equal(notFreeLine(amalAway), 'Not free at that time: times off on Monday from 08:00 to 09:00');
  assert.equal(notFreeLine(samiTeaching), 'Not free at that time: teaches DB-201 TD for SE - Year 2 from 09:00 to 10:30');
  assert.equal(
    notFreeText('Dr. Amal Ben Salah', dev, dev.classes[0], amalAway),
    'Dr. Amal Ben Salah cannot teach DEV-101 LECTURE for SE - Year 1 on Monday from 08:30 to 10:00, because Dr. Amal Ben Salah is not available on Monday from 08:00 to 09:00.',
  );
  assert.equal(
    notFreeText('Dr. Sami Trabelsi', dev, dev.classes[0], samiTeaching),
    'Dr. Sami Trabelsi cannot teach DEV-101 LECTURE for SE - Year 1 on Monday from 08:30 to 10:00, because at that time Dr. Sami Trabelsi teaches DB-201 TD for SE - Year 2 (09:00 to 10:30).',
  );
});
