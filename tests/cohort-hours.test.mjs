// Checks the Weekly Hours column of the Cohorts page (lib/cohort-hours.ts): it loads
// apart from the cohorts, for the term going on today, says what is not placed yet,
// sorts like the other columns, and says "Not known" when it could not load.
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../app/cohorts/page.tsx', import.meta.url), 'utf8');
const effect = source.slice(source.indexOf('const fetchWeeklyHours = async'), source.indexOf('fetchWeeklyHours();'));

test('cohorts: the weekly hours load apart from the cohorts, for the term going on today', () => {
  assert.match(source, /const \[weeklyHours, setWeeklyHours\] = useState<CohortHours \| null>\(null\);/);
  assert.ok(effect.length > 0, 'no fetchWeeklyHours');
  assert.match(effect, /Promise\.all\(\[\s*api\.getOfferings\(\),\s*api\.getTerms\(\),\s*\]\)/);
  assert.match(effect, /const termId = defaultTermId\(terms, localDay\(new Date\(\)\)\);/);
  assert.match(effect, /setWeeklyHours\(term \? cohortHours\(offerings, term\.id, term\.name\) : \{ termName: '', placed: \{\}, unplaced: \{\} \}\);/);
  assert.match(effect, /catch \(error\) \{[^}]*setWeeklyHours\(null\);/, 'a failure keeps old numbers');
  assert.match(source, /fetchWeeklyHours\(\);\s*\}, \[refreshTrigger\]\);/);
  assert.doesNotMatch(source.slice(source.indexOf('const fetchCohorts'), source.indexOf('fetchCohorts();')), /getOfferings/, 'the cohorts wait for the timetable');
});

test('cohorts: the Weekly Hours column, sortable, after Headcount', () => {
  const headers = [...source.matchAll(/columnKey="(\w+)"/g)].map((match) => match[1]);
  assert.deepEqual(headers, ['name', 'headcount', 'hours', 'term']);
  assert.match(source, /\{ key: 'hours', label: 'Weekly Hours', kind: 'number', value: \(cohort\) => minutesPlaced\(cohort\) \}/);
  assert.match(source, /const minutesPlaced = \(cohort: Cohort\) => weeklyHours\?\.placed\[cohort\.id\] \?\? 0;/);
  assert.match(source, /const minutesUnplaced = \(cohort: Cohort\) => weeklyHours\?\.unplaced\[cohort\.id\] \?\? 0;/);
  assert.match(source, /<span className=\{cards\.label\}>Weekly Hours<\/span>\s*\{weeklyHours === null \? \(\s*<span className="text-gray-500">Not known<\/span>/);
  assert.match(source, /\{cohortHoursText\(minutesPlaced\(cohort\), minutesUnplaced\(cohort\)\)\}/);
  assert.match(source, /\{notPlacedText\(minutesUnplaced\(cohort\)\) && \(\s*<span className="block text-xs font-medium text-amber-800">\{notPlacedText\(minutesUnplaced\(cohort\)\)\}<\/span>/, 'what is not placed yet does not stand out');
  assert.match(source, /Weekly hours in \{weeklyHours\.termName\}/, 'the term of the column is not said');
  assert.doesNotMatch(source, /colSpan=\{4\}/, 'a row across the table misses the new column');
  // Five columns do not fit a box of 36rem (xl): the table is shown from 42rem (2xl).
  assert.match(source, /^const cards = TABLE_CARDS\['2xl'\];$/m);
});
