// Tests for lib/teacher-times.ts: the times off on the Teachers page. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  END_TIMES,
  START_TIMES,
  nextTimeOff,
  sortTimesOff,
  timeOffLabel,
  timesOffProblem,
} from './teacher-times.ts';

const off = (dayOfWeek, startTime, endTime) => ({ dayOfWeek, startTime, endTime });

test('names a time off, and a whole day', () => {
  assert.equal(timeOffLabel(off('MONDAY', '08:00', '12:00')), 'Mon 08:00-12:00');
  assert.equal(timeOffLabel(off('SATURDAY', '08:00', '18:30')), 'Sat, all day');
});

test('lists the times every half hour from 08:00 to 18:30', () => {
  assert.equal(START_TIMES[0], '08:00');
  assert.equal(START_TIMES.at(-1), '18:00');
  assert.equal(END_TIMES[0], '08:30');
  assert.equal(END_TIMES.at(-1), '18:30');
  assert.equal(START_TIMES.length, 21);
  assert.ok(START_TIMES.includes('12:30') && END_TIMES.includes('10:00'));
});

test('sorts the times off by day, then by time', () => {
  const sorted = sortTimesOff([off('FRIDAY', '08:00', '10:00'), off('MONDAY', '14:00', '16:00'), off('MONDAY', '08:00', '09:00')]);
  assert.deepEqual(
    sorted.map(timeOffLabel),
    ['Mon 08:00-09:00', 'Mon 14:00-16:00', 'Fri 08:00-10:00'],
  );
});

test('a new time off takes the whole of the first free day', () => {
  assert.deepEqual(nextTimeOff([]), off('MONDAY', '08:00', '18:30'));
  assert.deepEqual(nextTimeOff([off('MONDAY', '08:00', '10:00'), off('TUESDAY', '08:00', '18:30')]), off('WEDNESDAY', '08:00', '18:30'));
});

test('finds a time off that ends before it starts, and two that overlap', () => {
  assert.equal(timesOffProblem([off('MONDAY', '08:00', '10:00'), off('MONDAY', '12:00', '12:00')]), 'Time off 2 must end after it starts.');
  assert.equal(
    timesOffProblem([off('MONDAY', '08:00', '12:00'), off('FRIDAY', '08:00', '18:30'), off('MONDAY', '11:30', '14:00')]),
    'Time off 1 and time off 3 overlap on Monday. Make them one time off.',
  );
});

test('accepts times off that only touch, or are on other days', () => {
  assert.equal(timesOffProblem([]), null);
  assert.equal(timesOffProblem([off('MONDAY', '08:00', '10:00'), off('MONDAY', '10:00', '12:00')]), null);
  assert.equal(timesOffProblem([off('MONDAY', '08:00', '18:30'), off('TUESDAY', '08:00', '18:30')]), null);
});
