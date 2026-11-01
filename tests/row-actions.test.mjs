// Checks the pages whose records can be edited and deleted: every Edit and Delete
// button says which record it acts on (screen readers read "Delete Dr. X", not just
// "Delete"), every Edit button has a Delete button, and a Delete button only opens
// the confirmation window.
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PAGES_WITH_ROW_ACTIONS = ['teachers', 'classrooms', 'locations', 'cohorts', 'terms', 'courses', 'offerings'];

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

  test(`${page}: after Edit, Cancel and Save empty the form again`, () => {
    // reset(values) also makes those values the form's starting values, so a later
    // reset() (Cancel, Save) would bring the record back. Every reset with values in
    // startEdit must keep the starting values.
    const start = source.indexOf('const startEdit');
    const startEdit = source.slice(start, source.indexOf('\n  };', start));
    const resets = startEdit.match(/\breset\w*\(\{/g) ?? [];
    const kept = startEdit.match(/\}, \{ keepDefaultValues: true \}\);/g) ?? [];
    assert.ok(resets.length > 0, 'startEdit does not fill the form');
    assert.equal(kept.length, resets.length, 'a reset in startEdit without { keepDefaultValues: true }');
    // reset attaches the fields again on the next render; a focus call before that
    // does nothing, so startEdit focuses inside setTimeout.
    assert.doesNotMatch(startEdit, /^\s*(setFocus|focus\w+)\(/m, 'startEdit focuses before the form has rendered again');
  });
}
