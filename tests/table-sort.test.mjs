// Checks the sorting of the tables (Classrooms, Teachers, Cohorts, Courses, Academic
// Terms): each sortable column heading is a SortHeader, the rows found by the search
// are sorted with lib/table-sort.ts, the "Sort by" list does the same where the table
// is shown as cards, and the line under the title says how the table is sorted. Course
// Offerings, a list of cards, has the Sort by list only. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

// page, the list of rows, the Sort by list, the columns that can be sorted
const PAGES = [
  ['teachers', 'teachers', 'sort-teachers', ['name', 'department', 'maxHours']],
  ['classrooms', 'rooms', 'sort-rooms', ['name', 'type', 'capacity', 'use', 'location']],
  ['cohorts', 'cohorts', 'sort-cohorts', ['name', 'headcount', 'term']],
  ['courses', 'courses', 'sort-courses', ['code', 'title', 'hours', 'credits']],
  ['terms', 'terms', 'sort-terms', ['name', 'type', 'start', 'end']],
];

for (const [page, rows, selectId, keys] of PAGES) {
  const source = read(`app/${page}/page.tsx`);
  const shown = `shown${rows[0].toUpperCase()}${rows.slice(1)}`;

  test(`${page}: the column headings sort the rows found by the search`, () => {
    assert.match(source, /const \[sort, setSort\] = useState<Sort>\(null\);/);
    const columns = [...source.matchAll(/\{ key: '(\w+)', label: '[^']+', kind: '(text|number|date)', value: /g)].map((match) => match[1]);
    assert.deepEqual(columns, keys, 'the columns that can be sorted');
    const headers = [...source.matchAll(/<SortHeader columns=\{sortColumns\} columnKey="(\w+)" sort=\{sort\} onSort=\{setSort\} \/>/g)].map((match) => match[1]);
    assert.deepEqual(headers, keys, 'one sorting heading per column, in the same order');
    assert.match(source, new RegExp(`const ${shown} = sortRows\\(\\s*filterBySearch\\(${rows}, search, [\\s\\S]*?\\),\\s*sortColumns,\\s*sort,\\s*\\);`));
  });

  test(`${page}: the Sort by list above the cards, and the line that says the order`, () => {
    assert.match(
      source,
      new RegExp(`<SortSelect id="${selectId}" columns=\\{sortColumns\\} sort=\\{sort\\} onSort=\\{setSort\\} className=\\{cards\\.sort\\} />`),
    );
    const bar = source.slice(source.indexOf('<TableSearchBar'), source.indexOf('/>', source.indexOf('<TableSearchBar')));
    assert.match(bar, /sorted=\{sortText\(sortColumns, sort\)\}/);
  });
}

// Course Offerings is a list of cards, not a table: only the Sort by list, always shown.
test('offerings: the Sort by list sorts the offerings found by the search', () => {
  const source = read('app/offerings/page.tsx');
  assert.match(source, /const \[sort, setSort\] = useState<Sort>\(null\);/);
  const columns = [...source.matchAll(/\{ key: '(\w+)', label: '([^']+)', kind: '(text|number|date)', value: /g)].map((match) => `${match[1]}:${match[3]}`);
  assert.deepEqual(columns, ['course:text', 'cohort:text', 'term:date', 'toPlace:number']);
  assert.match(source, /\{ key: 'term', label: 'Term', kind: 'date', value: \(offering\) => offering\.term\.startDate \}/, 'a term sorts by its start date');
  assert.match(source, /value: \(offering\) => offering\.classes\.length - scheduledCount\(offering\) \}/, 'Classes to place counts the classes not in the timetable');
  assert.match(source, /const shownOfferings = sortRows\(\s*filterBySearch\(offerings, search, [\s\S]*?\),\s*sortColumns,\s*sort,\s*\);/);
  assert.match(source, /<SortSelect\s+id="sort-offerings"\s+columns=\{sortColumns\}\s+sort=\{sort\}\s+onSort=\{setSort\}\s+className="[^"]*"\s*\/>/);
  assert.doesNotMatch(source, /<SortSelect[^>]*hidden/, 'the list is hidden');
  const bar = source.slice(source.indexOf('<TableSearchBar'), source.indexOf('/>', source.indexOf('<TableSearchBar')));
  assert.match(bar, /sorted=\{sortText\(sortColumns, sort\)\}/);
});

test('sorting heading: a button in the heading, with aria-sort on the heading', () => {
  const component = read('components/table-sort.tsx');
  assert.match(component, /<th aria-sort=\{direction\} className="p-4 font-medium">\s*<button\s+type="button"\s+onClick=\{\(\) => onSort\(nextSort\(sort, columnKey\)\)\}/);
  assert.match(component, /const direction = ariaSort\(sort, columnKey\);/);
  assert.match(component, /<Arrow aria-hidden="true"/, 'the arrow is hidden from screen readers, which hear aria-sort');
  assert.match(component, /<label htmlFor=\{id\}[^>]*>\s*Sort by\s*<\/label>\s*<select\s+id=\{id\}/, 'the Sort by list has its label');
  assert.match(component, /onChange=\{\(event\) => onSort\(sortFromChoice\(event\.target\.value\)\)\}/);
  const bar = read('components/table-search.tsx');
  assert.match(bar, /role="status"[^>]*>\s*\{\[count, sorted\]\.filter\(\(part\) => part\)\.join\('\. '\)\}/, 'the order is not said with the count');
});
