// Checks that "Clear timetable" on the home page asks first: the button only
// opens the confirmation window, and only that window clears the timetable.
// Generate and Clear send the chosen term.
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const buttons = source.split('<button').slice(1).map((chunk) => chunk.split('</button>')[0]);
const clearButton = buttons.find((button) => button.includes('Clear timetable'));

test('home page: Clear timetable only opens the confirmation window', () => {
  assert.ok(clearButton, 'no Clear timetable button');
  assert.match(clearButton, /onClick=\{\(\) => setConfirmClear\(true\)\}/);
  assert.doesNotMatch(clearButton, /api\./, 'the button clears without asking');
});

test('home page: the confirmation window is what clears the timetable', () => {
  assert.match(source, /<ConfirmDialog\b/, 'the page has no confirmation window');
  assert.match(source, /onConfirm=\{handleClear\}/);
  assert.equal(source.split('api.clearTimetable(').length - 1, 1, 'the timetable is cleared from more than one place');
});

test('home page: Generate and Clear work on the chosen term only', () => {
  assert.match(source, /api\.generateSchedule\(selectedTermId\)/, 'Generate does not send the chosen term');
  assert.match(source, /api\.clearTimetable\(selectedTermId\)/, 'Clear does not send the chosen term');
});
