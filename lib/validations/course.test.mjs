// Tests for the course form rules. Run them with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { courseSchema } from './course.ts';

const validCourse = {
  code: 'CS-101',
  title: 'Intro to Programming',
  credits: 6,
  totalHours: 60,
  offeredInTerms: ['SEMESTER_1'],
  componentsTemplate: [
    { type: 'LECTURE', totalComponentHours: 30, hoursPerSession: 1.5, requiresRoomType: 'AMPHI', requiredEquipment: [] },
    { type: 'TP', totalComponentHours: 30, hoursPerSession: 3, requiresRoomType: 'COMPUTER_LAB', requiredEquipment: [] },
  ],
};

// The first error message for one field, or undefined when that field is valid.
function errorFor(values, field) {
  const result = courseSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

test('accepts a complete course with credits', () => {
  assert.equal(courseSchema.safeParse(validCourse).success, true);
});

test('keeps the credits in the data sent to the server', () => {
  assert.equal(courseSchema.parse(validCourse).credits, 6);
});

test('asks for credits when the field is empty or missing', () => {
  assert.equal(errorFor({ ...validCourse, credits: Number.NaN }, 'credits'), 'Enter the number of credits');
  const { credits, ...withoutCredits } = validCourse;
  assert.equal(credits, 6);
  assert.equal(errorFor(withoutCredits, 'credits'), 'Enter the number of credits');
});

test('refuses credits that are not a whole number', () => {
  assert.equal(errorFor({ ...validCourse, credits: 2.5 }, 'credits'), 'Credits must be a whole number');
});

test('refuses credits outside 1 to 30', () => {
  assert.equal(errorFor({ ...validCourse, credits: 0 }, 'credits'), 'Credits must be at least 1');
  assert.equal(errorFor({ ...validCourse, credits: 31 }, 'credits'), 'Credits cannot be more than 30');
});

test('still asks for a title', () => {
  assert.equal(errorFor({ ...validCourse, title: '' }, 'title'), 'Title is required');
});

test('still checks that the part hours add up to the total hours', () => {
  assert.equal(
    errorFor({ ...validCourse, totalHours: 50 }, 'totalHours'),
    'The sum of component hours must exactly equal the Total Course Hours',
  );
});
