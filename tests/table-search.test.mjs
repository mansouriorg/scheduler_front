// Checks the search box above the list of every list page (Locations, Classrooms,
// Teachers, Cohorts, Courses, Academic Terms, Course Offerings): each page filters its
// rows with lib/table-search.ts, shows only the rows found, says how many there are,
// and says so when none is found, with a button that empties the search box.
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

// page, the list of rows, its search box, the name of one row, the no-match element
const PAGES = [
  ['teachers', 'teachers', 'search-teachers', 'teacher', 'NoMatchRow'],
  ['classrooms', 'rooms', 'search-rooms', 'room', 'NoMatchRow'],
  ['courses', 'courses', 'search-courses', 'course', 'NoMatchRow'],
  ['cohorts', 'cohorts', 'search-cohorts', 'cohort', 'NoMatchRow'],
  ['terms', 'terms', 'search-terms', 'term', 'NoMatchRow'],
  ['offerings', 'offerings', 'search-offerings', 'offering', 'NoMatchBlock'],
];

for (const [page, rows, inputId, one, noMatch] of PAGES) {
  const source = read(`app/${page}/page.tsx`);
  const shown = `shown${rows[0].toUpperCase()}${rows.slice(1)}`;

  test(`${page}: the table shows only the rows found by the search`, () => {
    assert.match(source, new RegExp(`const ${shown} = filterBySearch\\(${rows}, search, `), `${shown} is not filtered with filterBySearch`);
    assert.match(source, new RegExp(`\\b${shown}\\.map\\(\\(${one}\\) =>`), `the table does not show ${shown}`);
    assert.doesNotMatch(source, new RegExp(`\\b${rows}\\.map\\(\\(${one}\\) =>`), `the table still shows every ${one}`);
  });

  test(`${page}: the search box, its count, and the message when nothing is found`, () => {
    const bar = source.slice(source.indexOf('<TableSearchBar'), source.indexOf('/>', source.indexOf('<TableSearchBar')));
    assert.ok(bar.length > 0, 'no search box');
    assert.match(bar, new RegExp(`inputId="${inputId}"`));
    assert.match(bar, /value=\{search\}/);
    assert.match(bar, /onChange=\{setSearch\}/);
    assert.match(bar, new RegExp(`count=\\{searchCount\\(${shown}\\.length, ${rows}\\.length, search, '${one}', '${rows}'\\)\\}`));
    assert.match(
      source,
      new RegExp(`${shown}\\.length === 0 \\? \\(\\s*<${noMatch} [^>]*text=\\{noMatchText\\(search, '${one}'\\)\\} inputId="${inputId}" onClear=\\{\\(\\) => setSearch\\(''\\)\\} />`),
      'no message when no row is found',
    );
    // The message comes after "no rows at all", so an empty table still says that.
    assert.ok(source.indexOf(`${rows}.length === 0 ?`) < source.indexOf(`${shown}.length === 0 ?`), 'the no-match message hides the empty-table message');
  });
}

// Locations is a tree: campuses, their buildings, and the floors of each building.
test('locations: the tree shows only the campuses and buildings found by the search', () => {
  const source = read('app/locations/page.tsx');
  assert.match(source, /const shown = searchLocations\(campuses, buildings, floors, search\);/);
  assert.match(source, /\{shown\.campuses\.map\(campus => \(/, 'the tree does not show the campuses found');
  assert.match(source, /\{shown\.buildings\.filter\(b => b\.campusId === campus\.id\)\.map\(building => \(/, 'the tree does not show the buildings found');
  assert.doesNotMatch(source, /\{campuses\.map\(campus => |\{buildings\.filter\(b => b\.campusId === campus\.id\)\.map\(/, 'the tree still shows everything');
  const bar = source.slice(source.indexOf('<TableSearchBar'), source.indexOf('/>', source.indexOf('<TableSearchBar')));
  assert.match(bar, /inputId="search-locations"/);
  assert.match(bar, /value=\{search\}/);
  assert.match(bar, /onChange=\{setSearch\}/);
  assert.match(bar, /count=\{campusCount && `\$\{campusCount\}, \$\{buildingCount\}`\}/);
  assert.match(source, /const campusCount = searchCount\(shown\.campuses\.length, campuses\.length, search, 'campus', 'campuses'\);/);
  assert.match(source, /const buildingCount = searchCount\(shown\.buildings\.length, buildings\.length, search, 'building', 'buildings'\);/);
  assert.match(
    source,
    /shown\.campuses\.length === 0 \? \(\s*<NoMatchBlock text=\{noMatchText\(search, 'campus or building'\)\} inputId="search-locations" onClear=\{\(\) => setSearch\(''\)\} \/>/,
  );
  assert.ok(source.indexOf('campuses.length === 0 ?') < source.indexOf('shown.campuses.length === 0 ?'), 'the no-match message hides the empty-tree message');
});

test('cohorts: the number of cohorts stays next to the title', () => {
  const source = read('app/cohorts/page.tsx');
  assert.match(source, /\sbadge=\{\s*<span [^>]*>\s*Total Groups: \{cohorts\.length\}\s*<\/span>\s*\}/);
  assert.match(read('components/table-search.tsx'), /<h2 className="text-xl font-semibold text-gray-800">\{title\}<\/h2>\s*\{badge\}/);
});

test('search box: it has a name, says how many rows it shows, and Escape or Clear search empties it', () => {
  const box = read('components/table-search.tsx');
  assert.match(box, /type="search"/);
  assert.match(box, /aria-label=\{label\}/);
  assert.match(box, /aria-describedby=\{`\$\{inputId\}-count`\}/);
  assert.match(box, /<p id=\{`\$\{inputId\}-count`\} role="status"/, 'the count is not announced');
  assert.match(box, /event\.key === 'Escape' && value !== ''\) \{\s*event\.preventDefault\(\);\s*onChange\(''\);/);
  assert.match(box, /onClear\(\);\s*document\.getElementById\(inputId\)\?\.focus\(\);/, 'Clear search does not put the cursor back in the box');
});
