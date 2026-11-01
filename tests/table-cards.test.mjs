// Checks the pages with a data table: each one shows its rows as cards where the box
// of the table is narrow (phones, and the column next to the form on smaller
// laptops), with the column name in front of every value. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PAGES_WITH_TABLES = ['classrooms', 'cohorts', 'courses', 'teachers', 'terms'];

for (const page of PAGES_WITH_TABLES) {
  const source = readFileSync(new URL(`../app/${page}/page.tsx`, import.meta.url), 'utf8');

  test(`${page}: the table becomes cards where its box is narrow`, () => {
    assert.match(source, /import \{ TABLE_CARDS \} from '@\/lib\/table-cards';/);
    assert.match(source, /^const cards = TABLE_CARDS\['(xl|2xl|3xl)'\];$/m);
    // The "Sort by" list above the cards (lib/table-sort.ts) may come before the table.
    assert.match(
      source,
      /<div className="@container overflow-x-auto">\s*(<SortSelect [^\n]*className=\{cards\.sort\} \/>\s*)?<table className=\{`[^`]*\$\{cards\.table\}`\}>/,
    );
    assert.match(source, /<thead className=\{cards\.head\}>/);
    assert.match(source, /<tbody className=\{`[^`]*\$\{cards\.body\}`\}>/);
    assert.equal(source.match(/\$\{cards\.row\}/g)?.length, 1, 'one row of data with cards.row');
    assert.equal(source.match(/\$\{cards\.title\}/g)?.length, 1, 'one title cell');
    assert.equal(source.match(/cards\.actions/g)?.length, 1, 'one cell of buttons');
    assert.equal(source.match(/className=\{cards\.buttons\}/g)?.length, 1, 'one box of buttons');
  });

  test(`${page}: every value in a card has its column name`, () => {
    // A heading is a <th>, or a SortHeader whose label is in the sortColumns of the page.
    const sortLabels = Object.fromEntries([...source.matchAll(/\{ key: '(\w+)', label: '([^']+)'/g)].map((match) => [match[1], match[2]]));
    const headers = [...source.matchAll(/<th\b[^>]*>([^<]+)<\/th>|<SortHeader [^>]*columnKey="(\w+)"/g)].map((match) =>
      match[1] === undefined ? sortLabels[match[2]] : match[1].trim(),
    );
    const labels = [...source.matchAll(/<span className=\{cards\.label\}>([^<]+)<\/span>/g)].map((match) => match[1]);
    // The first column is the title of the card and the last one holds the buttons.
    assert.deepEqual(labels, headers.slice(1, -1));
  });
}
