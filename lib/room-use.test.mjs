// Tests for lib/room-use.ts: the weekly use of each room on the Classrooms page.
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEEK_MINUTES, isNearlyFull, roomUse, roomUseText } from './room-use.ts';

// A class in room roomId (null: none yet), at a time or not yet in the timetable.
const cls = (roomId, durationMinutes, placed = true) => ({
  assignedRoomId: roomId,
  startTime: placed ? '08:30' : null,
  durationMinutes,
});

test('a week of the timetable is Monday to Saturday, 08:00 to 18:30', () => {
  assert.equal(WEEK_MINUTES, 63 * 60);
});

test('adds up the classes of the term that are in the timetable, room by room', () => {
  const offerings = [
    { termId: 'fall', classes: [cls('amphi', 90), cls('lab', 180), cls('amphi', 120)] },
    { termId: 'fall', classes: [cls('lab', 90), cls(null, 60, false), cls('lab', 120, false)] },
    { termId: 'spring', classes: [cls('amphi', 300)] },
    { termId: 'fall' },
  ];
  assert.deepEqual(roomUse(offerings, 'fall', 'Fall 2026'), { termName: 'Fall 2026', minutes: { amphi: 210, lab: 270 } });
  assert.deepEqual(roomUse(offerings, 'spring', 'Spring 2027').minutes, { amphi: 300 });
  assert.deepEqual(roomUse([], 'fall', 'Fall 2026').minutes, {});
});

test('writes the use of a room, and says when it is not used or nearly full', () => {
  assert.equal(roomUseText(0), 'Not used');
  assert.equal(roomUseText(540), '9 of 63 hrs');
  assert.equal(roomUseText(90), '1.5 of 63 hrs');
  assert.equal(roomUseText(100), '1.67 of 63 hrs');
  // 80% of 63 hours is 50.4 hours.
  assert.equal(isNearlyFull(50 * 60), false);
  assert.equal(isNearlyFull(50.5 * 60), true);
  assert.equal(roomUseText(51 * 60), '51 of 63 hrs');
  assert.equal(roomUseText(63 * 60), '63 of 63 hrs');
});
