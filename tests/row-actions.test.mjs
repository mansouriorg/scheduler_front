// Checks the pages whose records can be edited and deleted: every Edit and Delete
// button says which record it acts on (screen readers read "Delete Dr. X", not just
// "Delete"), every Edit button has a Delete button, and a Delete button only opens
// the confirmation window.
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PAGES_WITH_ROW_ACTIONS = ['teachers', 'classrooms', 'locations', 'cohorts'];

for (const page of PAGES_WITH_ROW_ACTIONS) {
  const source = readFileSync(new URL(`../app/${page}/page.tsx`, import.meta.url), 'utf8');
  const buttons = source.split('<button').slice(1).map((chunk) => chunk.split('</button>')[0]);
  const editButtons = buttons.filter((button) => button.includes('startEdit('));
  const deleteButtons = buttons.filter((button) => button.includes('setToDelete('));

  test(`${page}: Edit and Delete buttons name the record they act on`, () => {
    assert.ok(editButtons.length > 0, 'no Edit button');
    assert.equal(deleteButtons.length, editButtons.length, 'expected a Delete button next to each Edit button');
    for (const button of [...editButtons, ...deleteButtons]) {
      assert.match(button, /aria-label=\{`(Edit|Delete) \$\{/, `button without the record name: ${button.slice(0, 80)}`);
    }
  });

  test(`${page}: deleting is confirmed first`, () => {
    assert.match(source, /<ConfirmDialog\b/, 'the page has no confirmation window');
    for (const button of deleteButtons) {
      assert.doesNotMatch(button, /api\./, 'a Delete button calls the API without asking');
    }
  });
}
