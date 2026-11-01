// Checks the Weekly Use column of the Classrooms page (lib/room-use.ts): it loads apart
// from the rooms, for the term going on today, sorts like the other columns, and says
// "Not known" when it could not load. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../app/classrooms/page.tsx', import.meta.url), 'utf8');
const effect = source.slice(source.indexOf('const fetchWeeklyUse = async'), source.indexOf('fetchWeeklyUse();'));

test('classrooms: the weekly use loads apart from the rooms, for the term going on today', () => {
  assert.match(source, /const \[weeklyUse, setWeeklyUse\] = useState<RoomUse \| null>\(null\);/);
  assert.ok(effect.length > 0, 'no fetchWeeklyUse');
  assert.match(effect, /Promise\.all\(\[\s*api\.getOfferings\(\),\s*api\.getTerms\(\),\s*\]\)/);
  assert.match(effect, /const termId = defaultTermId\(terms, localDay\(new Date\(\)\)\);/);
  assert.match(effect, /setWeeklyUse\(term \? roomUse\(offerings, term\.id, term\.name\) : \{ termName: '', minutes: \{\} \}\);/);
  assert.match(effect, /catch \(error\) \{[^}]*setWeeklyUse\(null\);/, 'a failure does not leave the column empty');
  assert.match(source, /fetchWeeklyUse\(\);\s*\}, \[refreshTrigger\]\);/, 'the use is not loaded again after a change');
  assert.ok(source.indexOf('const fetchRooms') < source.indexOf('const fetchWeeklyUse'), 'two loads, the rooms first');
  assert.doesNotMatch(source.slice(source.indexOf('const fetchRooms'), source.indexOf('fetchRooms();')), /getOfferings/, 'the rooms wait for the timetable');
});

test('classrooms: the Weekly Use column, sortable, after Capacity', () => {
  const headers = [...source.matchAll(/columnKey="(\w+)"/g)].map((match) => match[1]);
  assert.deepEqual(headers, ['name', 'type', 'capacity', 'use', 'location']);
  assert.match(source, /\{ key: 'use', label: 'Weekly Use', kind: 'number', value: \(room\) => minutesUsed\(room\) \}/);
  assert.match(source, /const minutesUsed = \(room: Room\) => weeklyUse\?\.minutes\[room\.id\] \?\? 0;/);
  assert.match(source, /<span className=\{cards\.label\}>Weekly Use<\/span>\s*\{weeklyUse === null \? \(\s*<span className="text-gray-500">Not known<\/span>/);
  assert.match(source, /isNearlyFull\(minutesUsed\(room\)\)\s*\?\s*'font-medium text-amber-800'/, 'a nearly full room does not stand out');
  assert.match(source, /<span className="whitespace-nowrap">\{roomUseText\(minutesUsed\(room\)\)\}<\/span>\s*\{isNearlyFull\(minutesUsed\(room\)\) && <span className="block text-xs">nearly full<\/span>\}/, 'a nearly full room is not said in words');
  assert.match(source, /Weekly use in \{weeklyUse\.termName\}/, 'the term of the column is not said');
  assert.doesNotMatch(source, /colSpan=\{6\}/, 'a row across the table misses the new column');
});
