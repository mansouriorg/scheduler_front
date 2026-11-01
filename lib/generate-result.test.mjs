// Tests for lib/generate-result.ts: what the home page shows after Generate.
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateNotice } from './generate-result.ts';

test('shows the summary, and the notes as a list', () => {
  const notice = generateNotice({
    summary: '12 classes were placed in the timetable of Fall 2026.',
    notes: ['1 class is on Saturday (DEV-101 TP): no time from Monday to Friday was found for it.'],
    message: 'the same in one text',
  });

  assert.deepEqual(notice, {
    text: '12 classes were placed in the timetable of Fall 2026.',
    notes: ['1 class is on Saturday (DEV-101 TP): no time from Monday to Friday was found for it.'],
  });
});

test('leaves out empty notes and anything that is not a sentence', () => {
  const notice = generateNotice({ summary: 'Placed.', notes: ['', '  ', 7, null, 'A note.'] });

  assert.deepEqual(notice.notes, ['A note.']);
  assert.deepEqual(generateNotice({ summary: 'Placed.', notes: 'not a list' }).notes, []);
});

test('shows the message when there is no summary', () => {
  assert.deepEqual(
    generateNotice({ message: 'All classes of Fall 2026 are already in the timetable. Nothing to do.' }),
    { text: 'All classes of Fall 2026 are already in the timetable. Nothing to do.', notes: [] },
  );
  assert.deepEqual(generateNotice({}), { text: 'The timetable was generated.', notes: [] });
});
