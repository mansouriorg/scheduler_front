// Tests for the timetable helpers. Run them with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_CLASSES,
  countClassesInView,
  defaultTermId,
  inView,
  localDay,
  printHeading,
  roomLabel,
  teacherLabel,
  termLabel,
  unplacedClasses,
  unplacedLabel,
  unplacedSummary,
  viewChoices,
} from './timetable.ts';

// A class of a cohort on a day, with its teacher and room (null: none yet).
const lesson = (cohortName, dayOfWeek, teacherId = null, roomId = null) => ({
  cohortName,
  dayOfWeek,
  teacherId,
  teacher: teacherId === null ? 'No teacher yet' : `Dr. ${teacherId}`,
  roomId,
  room: roomId === null ? 'Room not found' : `Room ${roomId}`,
});

const classes = [
  lesson('SE - Year 1', 'MONDAY', 'Sami', 'B2'),
  lesson('SE - Year 1', 'WEDNESDAY', 'Amal', 'A1'),
  lesson('SE - Year 1', 'FRIDAY', 'Amal', 'B2'),
  lesson('CS - Year 2', 'MONDAY'),
];

test('counts every class block when all classes are shown', () => {
  assert.equal(countClassesInView(classes, ALL_CLASSES), 4);
});

test('counts the blocks of one cohort on every day, not only on Monday', () => {
  assert.equal(countClassesInView(classes, 'cohort:SE - Year 1'), 3);
  assert.equal(countClassesInView(classes, 'cohort:CS - Year 2'), 1);
});

test('shows the week of one teacher or of one room', () => {
  assert.deepEqual(
    classes.filter((cls) => inView(cls, 'teacher:Amal')).map((cls) => cls.dayOfWeek),
    ['WEDNESDAY', 'FRIDAY'],
  );
  assert.deepEqual(
    classes.filter((cls) => inView(cls, 'room:B2')).map((cls) => cls.dayOfWeek),
    ['MONDAY', 'FRIDAY'],
  );
  // A class without a teacher or a room is in no teacher's or room's week.
  assert.equal(inView(classes[3], 'teacher:null'), false);
  assert.equal(inView(classes[3], 'room:null'), false);
});

test('lists each cohort, teacher and room once, by name', () => {
  assert.deepEqual(viewChoices(classes), {
    cohorts: [
      { value: 'cohort:CS - Year 2', label: 'CS - Year 2' },
      { value: 'cohort:SE - Year 1', label: 'SE - Year 1' },
    ],
    teachers: [
      { value: 'teacher:Amal', label: 'Dr. Amal' },
      { value: 'teacher:Sami', label: 'Dr. Sami' },
    ],
    rooms: [
      { value: 'room:A1', label: 'Room A1' },
      { value: 'room:B2', label: 'Room B2' },
    ],
  });
  assert.deepEqual(viewChoices([]), { cohorts: [], teachers: [], rooms: [] });
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
  assert.equal(countClassesInView(classes, 'cohort:Unknown group'), 0);
  assert.equal(countClassesInView([], ALL_CLASSES), 0);
});

// Two offerings as GET /course-offerings sends them: some classes are in the
// timetable (a day and a time), the others not yet.
const timed = (id, type, durationMinutes, assignedProfessorId, dayOfWeek = null, startTime = null) => ({
  id,
  type,
  durationMinutes,
  assignedProfessorId,
  dayOfWeek,
  startTime,
  endTime: null,
});
const rows = [
  {
    termId: 'fall-2026',
    course: { code: 'NET-110', title: 'Networks' },
    cohort: { name: 'AA - Year 3' },
    classes: [timed('n1', 'LECTURE', 90, 'p1', 'MONDAY', '08:30'), timed('n2', 'TP', 180, null)],
  },
  {
    termId: 'fall-2026',
    course: { code: 'DEV-101', title: 'Programming' },
    cohort: { name: 'SE - Year 1' },
    classes: [timed('d2', 'TD', 120, 'p1'), timed('d1', 'LECTURE', 90, 'gone')],
  },
];
const people = [{ id: 'p1', name: 'Dr. Amal Ben Salah' }];

test('lists the classes that are not in the timetable yet, by course, cohort and kind', () => {
  const unplaced = unplacedClasses(rows, people);

  assert.deepEqual(
    unplaced.map(unplacedLabel),
    [
      'DEV-101 LECTURE for SE - Year 1: 90 mins, Teacher not found',
      'DEV-101 TD for SE - Year 1: 120 mins, Dr. Amal Ben Salah',
      'NET-110 TP for AA - Year 3: 180 mins, No teacher yet',
    ],
  );
  assert.deepEqual(unplaced.map((cls) => cls.termId), ['fall-2026', 'fall-2026', 'fall-2026']);
  // A class that is not placed is in its cohort's and teacher's view, in no room's.
  assert.equal(inView(unplaced[1], 'teacher:p1'), true);
  assert.equal(inView(unplaced[1], 'cohort:SE - Year 1'), true);
  assert.equal(inView(unplaced[1], 'room:null'), false);
  assert.deepEqual(unplacedClasses([{ ...rows[0], classes: undefined }], people), []);
});

test('says how many classes are not in the timetable yet', () => {
  assert.equal(unplacedSummary(1, 'Fall 2026'), '1 class of Fall 2026 is not in the timetable yet');
  assert.equal(unplacedSummary(3, 'Dr. Amal Ben Salah'), '3 classes of Dr. Amal Ben Salah are not in the timetable yet');
});

test('heads the printed week with the term, the view and the number of class blocks', () => {
  assert.equal(printHeading('Fall 2026', 'Dr. Amal Ben Salah', 2), 'Fall 2026 timetable: Dr. Amal Ben Salah (2 class blocks)');
  assert.equal(printHeading('Fall 2026', 'SE - Year 1', 1), 'Fall 2026 timetable: SE - Year 1 (1 class block)');
  assert.equal(printHeading('Spring 2027', undefined, 14), 'Spring 2027 timetable: all classes (14 class blocks)');
});
