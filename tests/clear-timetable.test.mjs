// Checks that "Clear timetable" on the home page asks first: the button only
// opens the confirmation window, and only that window clears the timetable.
// Generate and Clear send the chosen term. The same for "Unschedule" on the Course
// Offerings page, which takes one offering's classes out of the timetable.
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

// Course Offerings: "Unschedule" takes only the classes of one offering out of the
// timetable, after asking first.
const offerings = readFileSync(new URL('../app/offerings/page.tsx', import.meta.url), 'utf8');
const unscheduleButton = offerings
  .split('<button')
  .slice(1)
  .map((chunk) => chunk.split('</button>')[0])
  .find((button) => button.includes('setToUnschedule('));

test('offerings: Unschedule names the offering, shows only when it has classes in the timetable, and only opens the window', () => {
  assert.ok(unscheduleButton, 'no Unschedule button');
  assert.match(unscheduleButton, /aria-label=\{`Unschedule \$\{offeringName\(offering\)\}`\}/);
  assert.doesNotMatch(unscheduleButton, /api\./, 'the button unschedules without asking');
  assert.match(offerings, /\{scheduledCount\(offering\) > 0 && \(\s*<button[^>]*?\s*onClick=\{\(\) => setToUnschedule\(offering\)\}/);
});

test('offerings: the window is what unschedules, for that offering only', () => {
  assert.match(offerings, /onConfirm=\{confirmUnschedule\}/);
  assert.equal(offerings.split('api.clearOfferingTimetable(').length - 1, 1, 'unscheduled from more than one place');
  assert.match(offerings, /api\.clearOfferingTimetable\(toUnschedule\.id\)/);
});

test('every confirmation window has its own ids, so a page can have two', () => {
  const dialog = readFileSync(new URL('../components/confirm-dialog.tsx', import.meta.url), 'utf8');
  assert.match(dialog, /aria-labelledby=\{titleId\}/);
  assert.match(dialog, /id=\{titleId\}/);
  assert.doesNotMatch(dialog, /id="/, 'a fixed id would be repeated when a page has two windows');
});
